import { useLayoutEffect } from 'react'
import { createPortfolioMotion } from './engine'

export default function usePortfolioMotion(reduced) {
  useLayoutEffect(() => createPortfolioMotion(document.getElementById('root'), reduced), [reduced])
}
