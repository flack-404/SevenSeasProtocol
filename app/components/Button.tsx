export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export default function Button({
  children,
  onClick,
  className,
  variant = 'primary',
  ...props
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: ButtonVariant;
  [key: string]: any;
}) {

  const buttonVariants = {
    primary: ' bg-[#44ba5c] ',
    secondary: 'bg-[#7a4f2f]',
    danger: 'bg-red-500',
  }

  return (
    <button className={`hover:scale-105 transition-all duration-100 relative ${className}`} onClick={onClick} {...props} type="button">
      <span className={`w-[calc(100%-4px)] h-[calc(100%-4px)] ml-[3px] mt-[3px]  z-[1] absolute top-[-1px] left-[-1px] ${buttonVariants[variant]} bg-blend-screen mix-blend-multiply`}/>
    <span  className={`relative disabled:opacity-50 ui3 px-4 py-4 text-center flex items-center justify-center gap-2 text-white text-shadow-[0_2px_0px_#000] ${className}`}>
      <span className='z-[2] relative uppercase tracking-widest'>{children}</span>
    </span>
    </button>
  );
}
