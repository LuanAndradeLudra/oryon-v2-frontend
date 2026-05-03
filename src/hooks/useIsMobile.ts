import { useMediaQuery } from './useMediaQuery'

const MOBILE_QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}
