/** API 基础地址，优先使用环境变量，默认代理到 /api/v1 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/** 本地存储 Token 的键名 */
export const TOKEN_KEY = 'aisqa_token'

/** 本地存储刷新 Token 的键名 */
export const REFRESH_TOKEN_KEY = 'aisqa_refresh_token'

/** 分页查询默认每页条数 */
export const PAGE_SIZE = 20
