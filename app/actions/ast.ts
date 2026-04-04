'use server'

/**
 * Robust Regex-based AST parser fallback.
 * Extracts function signatures (headers) from source code based on language.
 * Since native tree-sitter bindings failed to build in this environment, 
 * this provides a robust and fast alternative for standard challenge file formats.
 */
export async function parseFunctionHeaders(code: string, language: string) {
  const signatures: { name: string; signature: string }[] = []

  switch (language) {
    case 'python': {
      // Matches: def function_name(arg1, arg2) -> RetType:
      const pyRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*(?:->\s*[^:]+)?\s*:/g
      let match;
      while ((match = pyRegex.exec(code)) !== null) {
        signatures.push({ name: match[1], signature: match[0].trim() })
      }
      break;
    }
    case 'typescript':
    case 'javascript': {
      // Matches: function functionName(args)
      const jsFuncRegex = /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)/g
      let match;
      while ((match = jsFuncRegex.exec(code)) !== null) {
        signatures.push({ name: match[1], signature: match[0].trim() })
      }
      // Matches: const functionName = (args) =>
      const jsArrowRegex = /(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\(([\s\S]*?)\)\s*=>/g
      while ((match = jsArrowRegex.exec(code)) !== null) {
        signatures.push({ name: match[1], signature: match[0].trim() })
      }
      break;
    }
    case 'c':
    case 'cpp': {
      // Matches: int function_name(int arg1, char arg2) {
      const cRegex = /^[ \t]*[a-zA-Z_][a-zA-Z0-9_*\s]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*\{/gm
      let match;
      while ((match = cRegex.exec(code)) !== null) {
        // Exclude common control flow keywords
        if (['if', 'while', 'for', 'switch'].includes(match[1])) continue;
        signatures.push({ name: match[1], signature: match[0].replace(/\{$/, '').trim() })
      }
      break;
    }
    case 'java': {
      // Matches: public static void main(String[] args) {
      const javaRegex = /(?:public|protected|private|static|\s)+[\w<>[\]]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*(?:throws\s+[^{]+)?\{/g
      let match;
      while ((match = javaRegex.exec(code)) !== null) {
        if (['if', 'while', 'for', 'switch', 'catch'].includes(match[1])) continue;
        signatures.push({ name: match[1], signature: match[0].replace(/\{$/, '').trim() })
      }
      break;
    }
    case 'rust': {
      // Matches: pub fn function_name<T>(arg: T) -> RetType {
      const rsRegex = /(?:pub\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<.*?>)?\s*\(([\s\S]*?)\)\s*(?:->\s*[^{]+)?\s*\{/g
      let match;
      while ((match = rsRegex.exec(code)) !== null) {
        signatures.push({ name: match[1], signature: match[0].replace(/\{$/, '').trim() })
      }
      break;
    }
  }

  // Remove duplicates
  const uniqueSigs = Array.from(new Map(signatures.map(s => [s.name, s])).values());
  return uniqueSigs;
}
