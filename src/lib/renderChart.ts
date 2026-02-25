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

export interface RenderResult {
  element: React.ReactElement | null;
  chartData: Record<string, unknown>[] | null;
}

export function renderChart(
  jsxString: string,
  data: Record<string, unknown>
): RenderResult {
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
    // Find the JSX expression at the end of the code by searching for
    // the last top-level `(<` or `<ResponsiveContainer` pattern.
    // This is more robust than tracking declaration boundaries.
    const lines = cleaned.split("\n");

    let jsxStartLine = -1;
    let depth = { brace: 0, paren: 0, bracket: 0 };

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // At top level, a line starting with `(` followed by `<` or directly `<`
      // signals the start of the JSX return expression
      if (
        depth.brace === 0 &&
        depth.paren === 0 &&
        depth.bracket === 0 &&
        (trimmed.match(/^\(\s*</) || trimmed.match(/^<\s*\w/))
      ) {
        jsxStartLine = i;
        break; // First match from top that's at depth 0 after declarations
      }
      for (const ch of lines[i]) {
        if (ch === "{") depth.brace++;
        if (ch === "}") depth.brace--;
        if (ch === "(") depth.paren++;
        if (ch === ")") depth.paren--;
        if (ch === "[") depth.bracket++;
        if (ch === "]") depth.bracket--;
      }
    }

    console.log("[renderChart] jsxStartLine:", jsxStartLine, "of", lines.length, "lines");

    if (jsxStartLine > 0) {
      const declarationPart = lines.slice(0, jsxStartLine).join("\n");
      const jsxPart = lines.slice(jsxStartLine).join("\n").trim();
      console.log("[renderChart] declarationPart length:", declarationPart.length, "jsxPart length:", jsxPart.length);
      const unwrapped = jsxPart.replace(/^\(\s*/, "").replace(/\s*\)\s*;?\s*$/, "");
      wrappedCode = `(function() {
${declarationPart}
var __element = (${unwrapped});
return { element: __element, chartData: typeof chartData !== 'undefined' ? chartData : null };
})()`;
    } else {
      // Could not find JSX split point — try to find JSX anywhere and add return
      const jsxMatch = cleaned.match(/(\(\s*<ResponsiveContainer[\s\S]*$)/);
      if (jsxMatch) {
        const jsxIndex = cleaned.lastIndexOf(jsxMatch[1]);
        const declarationPart = cleaned.substring(0, jsxIndex).trim();
        const jsxPart = jsxMatch[1].trim();
        const unwrapped = jsxPart.replace(/^\(\s*/, "").replace(/\s*\)\s*;?\s*$/, "");
        wrappedCode = `(function() {
${declarationPart}
var __element = (${unwrapped});
return { element: __element, chartData: typeof chartData !== 'undefined' ? chartData : null };
})()`;
      } else {
        // Last resort — wrap entire code as IIFE
        console.warn("[renderChart] Could not find JSX split point, wrapping entire code");
        wrappedCode = `(function() {
${cleaned}
})()`;
      }
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
  const raw = fn(React, data, ...componentValues);

  // Handle both return shapes: { element, chartData } or plain React element
  if (raw && typeof raw === "object" && "element" in raw) {
    console.log("[renderChart] Got element + chartData:", raw.chartData ? `${raw.chartData.length} items` : "null");
    return { element: raw.element, chartData: raw.chartData };
  }

  console.log("[renderChart] Result type:", typeof raw, raw ? "ok" : "empty");
  return { element: raw, chartData: null };
}
