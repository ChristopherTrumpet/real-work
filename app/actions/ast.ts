'use server'

/**
 * Robust Regex-based AST parser fallback.
 * Extracts function signatures (headers) and generates boilerplates.
 */
export async function parseFunctionHeaders(code: string, language: string) {
  const signatures: { name: string; signature: string; boilerplate: string }[] = []

  switch (language) {
    case 'python': {
      const pyRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*(?:->\s*[^:]+)?\s*:/g
      let match;
      while ((match = pyRegex.exec(code)) !== null) {
        signatures.push({ 
          name: match[1], 
          signature: match[0].trim(),
          boilerplate: `${match[0].trim()}\n    # Your implementation here\n    pass`
        })
      }
      break;
    }
    case 'typescript':
    case 'javascript': {
      const jsFuncRegex = /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)/g
      let match;
      while ((match = jsFuncRegex.exec(code)) !== null) {
        signatures.push({ 
          name: match[1], 
          signature: match[0].trim(),
          boilerplate: `${match[0].trim()} {\n  // Your implementation here\n}`
        })
      }
      const jsArrowRegex = /(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\(([\s\S]*?)\)\s*=>/g
      while ((match = jsArrowRegex.exec(code)) !== null) {
        signatures.push({ 
          name: match[1], 
          signature: match[0].trim(),
          boilerplate: `${match[0].trim()} {\n  // Your implementation here\n}`
        })
      }
      break;
    }
    case 'c':
    case 'cpp': {
      const cRegex = /^[ \t]*[a-zA-Z_][a-zA-Z0-9_*\s]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*\{/gm
      let match;
      while ((match = cRegex.exec(code)) !== null) {
        if (['if', 'while', 'for', 'switch'].includes(match[1])) continue;
        const sig = match[0].replace(/\{$/, '').trim()
        signatures.push({ 
          name: match[1], 
          signature: sig,
          boilerplate: `${sig} {\n  // Your implementation here\n}`
        })
      }
      break;
    }
    case 'java': {
      const javaRegex = /(?:public|protected|private|static|\s)+[\w<>[\]]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*(?:throws\s+[^{]+)?\{/g
      let match;
      while ((match = javaRegex.exec(code)) !== null) {
        if (['if', 'while', 'for', 'switch', 'catch'].includes(match[1])) continue;
        const sig = match[0].replace(/\{$/, '').trim()
        signatures.push({ 
          name: match[1], 
          signature: sig,
          boilerplate: `${sig} {\n  // Your implementation here\n}`
        })
      }
      break;
    }
    case 'rust': {
      const rsRegex = /(?:pub\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<.*?>)?\s*\(([\s\S]*?)\)\s*(?:->\s*[^{]+)?\s*\{/g
      let match;
      while ((match = rsRegex.exec(code)) !== null) {
        const sig = match[0].replace(/\{$/, '').trim()
        signatures.push({ 
          name: match[1], 
          signature: sig,
          boilerplate: `${sig} {\n    // Your implementation here\n    todo!()\n}`
        })
      }
      break;
    }
  }

  return Array.from(new Map(signatures.map(s => [s.name, s])).values());
}
