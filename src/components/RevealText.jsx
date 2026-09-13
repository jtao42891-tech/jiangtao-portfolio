export default function RevealText({ children, className = '' }) {
  return <span className={'heading-line ' + className}><span>{children}</span></span>
}
