interface Props {
  rating: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (r: number) => void
}

export default function StarRating({ rating, max = 5, size = 'md', interactive = false, onChange }: Props) {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' }
  return (
    <div className={`flex gap-0.5 ${sizes[size]}`}>
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => interactive && onChange?.(i + 1)}
          className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} ${i < rating ? 'text-accent' : 'text-gray-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
