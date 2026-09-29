import type { SVGProps } from 'react'

// Hand-drawn, 1.7px strokes, currentColor. Decorative by default.
function Base({ children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  )
}

export const IconBolt = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M13 3 5.5 13.2h5.6L10 21l7.5-10.2h-5.6L13 3Z" /></Base>
)
export const IconTimer = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><circle cx="12" cy="13.5" r="7.5" /><path d="M12 13.5V9.6M9.6 2.8h4.8M18.4 6.4l1.3-1.3" /></Base>
)
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M12 3.2 5 5.8v5.6c0 4.3 2.9 7.9 7 9.4 4.1-1.5 7-5.1 7-9.4V5.8l-7-2.6Z" /><path d="m9 12.2 2.2 2.2L15.3 10" /></Base>
)
export const IconTrophy = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M8 4h8v5.2a4 4 0 0 1-8 0V4ZM8 6H4.8a3 3 0 0 0 3.4 4M16 6h3.2a3 3 0 0 1-3.4 4M12 13.2V17M8.5 20.5h7M9.8 17h4.4" /></Base>
)
export const IconGrid = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" /></Base>
)
export const IconWallet = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h10.5v2.5M4.5 7.5V17A2.5 2.5 0 0 0 7 19.5h12.5V10H7a2.5 2.5 0 0 1-2.5-2.5Z" /><circle cx="16" cy="14.8" r="1" /></Base>
)
export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M14 5h5v5M19 5l-8.5 8.5M17 13.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8.5A1.5 1.5 0 0 1 6 7h4.5" /></Base>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="m5.5 12.5 4.2 4.2 8.8-9.4" /></Base>
)
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M12 4 3 19.5h18L12 4Z" /><path d="M12 10v4.2M12 17h.01" /></Base>
)
export const IconSwap = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M7 7.5h11.5l-3-3M17 16.5H5.5l3 3" /></Base>
)
export const IconMenu = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M4.5 8h15M4.5 16h15" /></Base>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /></Base>
)
export const IconCopy = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2.2" /><path d="M15.5 8.5V6.2a1.7 1.7 0 0 0-1.7-1.7H6.2a1.7 1.7 0 0 0-1.7 1.7v7.6a1.7 1.7 0 0 0 1.7 1.7h2.3" /></Base>
)
export const IconKey = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><circle cx="8" cy="15.5" r="3.8" /><path d="m10.8 12.8 8-8M16.5 7l2.3 2.3M14.2 9.3l1.8 1.8" /></Base>
)
