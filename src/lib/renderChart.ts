import React from "react";
import * as Recharts from "recharts";

declare global {
  interface Window {
    Babel: {
      transform: (
        code: string,
        options: { presets: string[] }
      ) => { code: string };
    };
  }
}

export function renderChart(
  jsxString: string,
  data: Record<string, unknown>
): React.ReactElement | null {
  if (!window.Babel) {
    throw new Error("Babel standalone not loaded");
  }

  // Clean up the JSX string
  let cleaned = jsxString
    .replace(/```(?:jsx|tsx)?\n?/g, "")
    .replace(/```/g, "")
    .replace(/^import\s+.*;\s*$/gm, "")
    .trim();

  const hasDeclarations = /^\s*(const|let|var)\s/m.test(cleaned);

  let wrappedCode: string;

  if (hasDeclarations) {
    // Find the boundary between declarations and the final JSX expression.
    // The JSX block starts with either `(<` or just `<` at the top level,
    // AFTER all const/let/var declarations are done.
    // Strategy: find the last declaration statement's semicolon or end,
    // then everything after is the JSX.

    // Split by finding the opening ( or < that starts the JSX return block.
    // We look for a line that starts with ( or < AND is NOT inside a declaration.
    // Simpler: find the last `const|let|var` line, then find where its statement ends,
    // everything after is JSX.

    const lines = cleaned.split("\n");

    // Find the last TOP-LEVEL const/let/var declaration.
    // Track brace depth so we skip declarations nested inside arrow functions.
    let lastDeclLine = -1;
    let scanBrace = 0;
    let scanParen = 0;
    let scanBracket = 0;
    for (let i = 0; i < lines.length; i++) {
      // Check for top-level declaration BEFORE updating depths for this line
      if (
        scanBrace === 0 &&
        scanParen === 0 &&
        scanBracket === 0 &&
        /^\s*(const|let|var)\s/.test(lines[i])
      ) {
        lastDeclLine = i;
      }
      for (const ch of lines[i]) {
        if (ch === "{") scanBrace++;
        if (ch === "}") scanBrace--;
        if (ch === "(") scanParen++;
        if (ch === ")") scanParen--;
        if (ch === "[") scanBracket++;
        if (ch === "]") scanBracket--;
      }
    }

    // Now find where that last top-level declaration ends
    let declEndLine = lastDeclLine;
    let braceDepth = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    for (let i = lastDeclLine; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
        if (ch === "(") parenDepth++;
        if (ch === ")") parenDepth--;
        if (ch === "[") bracketDepth++;
        if (ch === "]") bracketDepth--;
      }
      // Declaration is complete when all brackets are balanced and line ends with ;
      if (braceDepth <= 0 && parenDepth <= 0 && bracketDepth <= 0) {
        const trimmed = lines[i].trim();
        if (trimmed.endsWith(";") || trimmed.endsWith(");") || trimmed.endsWith("},") || trimmed.endsWith("}")) {
          declEndLine = i;
          break;
        }
      }
    }

    const declarationPart = lines.slice(0, declEndLine + 1).join("\n");
    const jsxPart = lines.slice(declEndLine + 1).join("\n").trim();

    if (jsxPart) {
      // Remove wrapping parens if present: (\n<JSX>\n) -> <JSX>
      const unwrapped = jsxPart.replace(/^\(\s*/, "").replace(/\s*\)\s*;?\s*$/, "");
      // If the JSX part already starts with "return", don't add another
      const returnPrefix = /^\s*return\s/.test(unwrapped) ? "" : "return ";
      wrappedCode = `(function() {
${declarationPart}
${returnPrefix}(${unwrapped});
})()`;
    } else {
      wrappedCode = `(function() {
${cleaned}
})()`;
    }
  } else {
    wrappedCode = cleaned;
  }

  console.log("[renderChart] Code to transform:", wrappedCode);

  const transformed = window.Babel.transform(wrappedCode, {
    presets: ["react"],
  });

  console.log("[renderChart] Babel output (first 300):", transformed.code.substring(0, 300));

  const componentNames = Object.keys(Recharts);
  const componentValues = Object.values(Recharts);

  let body: string;
  const code = transformed.code.replace(/;\s*$/, "");
  if (hasDeclarations) {
    body = `"use strict"; return ${code};`;
  } else {
    body = `"use strict"; return (${code});`;
  }

  const fn = new Function("React", "data", ...componentNames, body);
  const result = fn(React, data, ...componentValues);

  console.log("[renderChart] Result type:", typeof result, result ? "ok" : "empty");

  return result;
}
