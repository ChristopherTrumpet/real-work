import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export interface BenchmarkResult {
  correctness: boolean
  total_time_ms: number
  max_memory_kb: number
  error?: string
  tests: {
    test_index: number
    passed: boolean
    user_time_ms: number
    user_memory_kb: number
    gold_time_ms: number
    expected_output?: string
    actual_output?: string
    error?: string
  }[]
}

export interface BenchmarkOptions {
  containerId: string
  language: 'c' | 'typescript' | 'rust' | 'java' | 'python'
  userCode: string
  goldCode: string
  testCases: string[] // Array of stdin inputs for each test
  timeoutMs?: number
}

// The Python runner script that will be injected into the container
const RUNNER_SCRIPT = `import sys
import os
import json
import time
import subprocess
import resource

def compile_code(lang, filepath, outpath):
    if lang == 'c':
        subprocess.run(['gcc', filepath, '-o', outpath, '-O3'], check=True, capture_output=True)
        return [outpath]
    elif lang == 'rust':
        subprocess.run(['rustc', filepath, '-o', outpath], check=True, capture_output=True)
        return [outpath]
    elif lang == 'java':
        subprocess.run(['javac', filepath], check=True, capture_output=True)
        classname = os.path.basename(filepath).replace('.java', '')
        return ['java', classname]
    elif lang == 'typescript':
        return ['npx', 'ts-node', filepath]
    elif lang == 'python':
        return ['python3', filepath]
    else:
        raise ValueError("Unsupported language")

def run_test(cmd, stdin_data, timeout):
    start_time = time.perf_counter()
    usage_start = resource.getrusage(resource.RUSAGE_CHILDREN)
    
    try:
        process = subprocess.run(cmd, input=stdin_data, text=True, capture_output=True, timeout=timeout)
        usage_end = resource.getrusage(resource.RUSAGE_CHILDREN)
        end_time = time.perf_counter()
        
        stdout = process.stdout
        stderr = process.stderr
        exit_code = process.returncode
        
        # ru_maxrss is in KB on Linux
        memory_kb = usage_end.ru_maxrss - usage_start.ru_maxrss
        if memory_kb < 0:
            memory_kb = usage_end.ru_maxrss
            
        return {
            "success": exit_code == 0,
            "stdout": stdout,
            "stderr": stderr,
            "time_ms": (end_time - start_time) * 1000,
            "memory_kb": memory_kb,
            "exit_code": exit_code
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Timeout",
            "time_ms": timeout * 1000,
            "memory_kb": 0,
            "exit_code": -1
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "time_ms": 0,
            "memory_kb": 0,
            "exit_code": -1
        }

def main():
    if len(sys.argv) < 6:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)
        
    lang = sys.argv[1]
    user_file = sys.argv[2]
    gold_file = sys.argv[3]
    test_cases_file = sys.argv[4]
    timeout = int(sys.argv[5])
    
    with open(test_cases_file, 'r') as f:
        test_cases = json.load(f)
        
    try:
        user_cmd = compile_code(lang, user_file, './user_out')
    except subprocess.CalledProcessError as e:
        print(json.dumps({"error": f"User code compilation failed: {e.stderr.decode('utf-8') if e.stderr else str(e)}"}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": f"User code compilation failed: {str(e)}"}))
        sys.exit(0)

    try:
        gold_cmd = compile_code(lang, gold_file, './gold_out')
    except subprocess.CalledProcessError as e:
        print(json.dumps({"error": f"Gold code compilation failed: {e.stderr.decode('utf-8') if e.stderr else str(e)}"}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": f"Gold code compilation failed: {str(e)}"}))
        sys.exit(0)
        
    results = {
        "correctness": True,
        "total_time_ms": 0,
        "max_memory_kb": 0,
        "tests": []
    }
    
    for i, tc in enumerate(test_cases):
        gold_res = run_test(gold_cmd, tc, timeout)
        user_res = run_test(user_cmd, tc, timeout)
        
        passed = False
        if gold_res['success'] and user_res['success']:
            if gold_res['stdout'].strip() == user_res['stdout'].strip():
                passed = True
                
        results['tests'].append({
            "test_index": i,
            "passed": passed,
            "user_time_ms": user_res.get('time_ms', 0),
            "user_memory_kb": user_res.get('memory_kb', 0),
            "gold_time_ms": gold_res.get('time_ms', 0),
            "expected_output": gold_res.get('stdout', '').strip() if gold_res.get('stdout') else '',
            "actual_output": user_res.get('stdout', '').strip() if user_res.get('stdout') else '',
            "error": user_res.get('error') or user_res.get('stderr')
        })
        
        if not passed:
            results['correctness'] = False
            
        results['total_time_ms'] += user_res.get('time_ms', 0)
        results['max_memory_kb'] = max(results['max_memory_kb'], user_res.get('memory_kb', 0))
        
    print(json.dumps(results))

if __name__ == '__main__':
    main()
`

const extensions: Record<string, string> = {
  c: 'c',
  typescript: 'ts',
  rust: 'rs',
  java: 'java',
  python: 'py'
}

export async function runBenchmark(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { containerId, language, userCode, goldCode, testCases, timeoutMs = 10000 } = options
  const ext = extensions[language]
  
  if (!ext) {
    throw new Error(`Unsupported language: ${language}`)
  }

  // Create temporary directory on host
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'benchmark-'))
  
  // Naming the files correctly for compilation
  const javaUserFile = 'UserSolution.java'
  const javaGoldFile = 'GoldSolution.java'
  const userFile = language === 'java' ? javaUserFile : `user_code.${ext}`
  const goldFile = language === 'java' ? javaGoldFile : `gold_code.${ext}`

  const userFilePath = path.join(tmpDir, userFile)
  const goldFilePath = path.join(tmpDir, goldFile)
  const testCasesPath = path.join(tmpDir, 'testcases.json')
  const runnerPath = path.join(tmpDir, 'runner.py')

  try {
    // Write files to temp dir
    await fs.writeFile(userFilePath, userCode)
    await fs.writeFile(goldFilePath, goldCode)
    await fs.writeFile(testCasesPath, JSON.stringify(testCases))
    await fs.writeFile(runnerPath, RUNNER_SCRIPT)

    const workdir = '/tmp/benchmark'
    
    // Cleanup any existing benchmark folder and create a new one
    await execAsync(`docker exec ${containerId} rm -rf ${workdir} && docker exec ${containerId} mkdir -p ${workdir}`)

    // Copy files into the container
    await execAsync(`docker cp ${userFilePath} ${containerId}:${workdir}/${userFile}`)
    await execAsync(`docker cp ${goldFilePath} ${containerId}:${workdir}/${goldFile}`)
    await execAsync(`docker cp ${testCasesPath} ${containerId}:${workdir}/testcases.json`)
    await execAsync(`docker cp ${runnerPath} ${containerId}:${workdir}/runner.py`)

    // Ensure permissions
    await execAsync(`docker exec ${containerId} chmod -R 777 ${workdir}`)

    // Execute the runner inside the container
    const timeoutSeconds = Math.ceil(timeoutMs / 1000)
    const execCommand = `docker exec -w ${workdir} ${containerId} python3 runner.py ${language} ${userFile} ${goldFile} testcases.json ${timeoutSeconds}`
    
    const { stdout, stderr } = await execAsync(execCommand)

    try {
      const result = JSON.parse(stdout.trim()) as BenchmarkResult
      return result
    } catch (parseError: any) {
      console.error('Failed to parse evaluator output:', stdout, stderr)
      throw new Error('Invalid JSON response from evaluator script')
    }

  } catch (error: any) {
    console.error('Benchmark execution error:', error)
    return {
      correctness: false,
      total_time_ms: 0,
      max_memory_kb: 0,
      error: error.message || String(error),
      tests: []
    }
  } finally {
    // Cleanup temporary files on the host
    await fs.rm(tmpDir, { recursive: true, force: true })
    
    // Attempt to cleanup within the container
    try {
      await execAsync(`docker exec ${containerId} rm -rf /tmp/benchmark`)
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}
