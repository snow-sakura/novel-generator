/// <reference types="vite/client" />

/* ── CSS 模块声明 ── */
declare module '*.css' {
  const content: string
  export default content
}
