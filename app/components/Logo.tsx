import Image from "next/image";

export const Logo = ({className}: {className?: string}) => {
  return (
            <Image
          unoptimized
          src="/logo.png"
          alt="Seven Seas Protocol"
          width={256}
          height={256}
          className={`${className}` }
        />
  );
};