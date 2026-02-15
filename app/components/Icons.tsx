import Image from "next/image";

export const Icon = ({iconName, className}: {iconName: string, className?: string}) => {

    const icons = {
        "pin": "/icons/pin_mark.webp",
        "pirates": "/icons/pirates_flag_mini.webp",
        "navy": "/icons/navy_flag_mini.webp",
        "swords": "/icons/swords.webp",
        "gold": "/icons/gold.webp",
        "diamond": "/icons/diamond.webp",
        "info": "/icons/info.webp",
    }
    
  return <Image unoptimized className={className} src={icons[iconName as keyof typeof icons]} alt={iconName} width={20} height={20} />;
};