import { useEffect } from "react";
import { useRef } from "react";
export const Modal = ({
  children,
  childrenFooter,
  title,
  open,
  setOpen,
  ui = "ui1",
  textColor = "text-black",
  removeCloseButton = false,
  removeOverlay = false,
  containerClassName,
  className,
  dialogClassName,
}: {
  children: React.ReactNode;
  childrenFooter?: React.ReactNode;
  title?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  ui?: string;
  textColor?: string;
  removeCloseButton?: boolean;
  removeOverlay?: boolean;
  containerClassName?: string;
  className?: string;
  dialogClassName?: string;
}) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  //add a click outside listener to close the modal
  useEffect(() => {
    const modal = modalRef.current;
    const handleClickOutside = (event: MouseEvent) => {
      if (modal && !modal.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [open, setOpen]);

  //add a keydown listener to close the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  return (
    open && (
      <div className={`fixed left-0 top-0 !p-4 ${removeOverlay ? "bg-transparent" : "bg-black/50 bg-opacity-50"} w-screen h-screen flex items-start md:items-center  justify-start md:justify-center z-[10] `}>
        <dialog
          ref={modalRef}
          aria-modal="true"
          className={`p-3 bg-transparent md:mx-auto w-auto md:h-auto  md:mt-0 mt-[40px] max-w-full md:!max-w-[550px] space-y-3 flex flex-col  justify-between md:justify-center ${className} `}
        >
          <div className={`${ui} flex flex-col max-h-[calc(100dvh-100px)] md:h-auto ${textColor}`}>
          {!removeCloseButton && !title && <header className="uppercase flex items-center  px-6 pt-6  justify-between w-full">
            <h2 className={`!text-2xl !text-white font-bold ${textColor}`}>{title}</h2>
            {!removeCloseButton && <button
              className={`!text-2xl !text-white font-bold ${textColor}`}
              onClick={() => setOpen(false)}
            >
              X
            </button>}
          </header>}
          <div className={`${containerClassName} h-full flex flex-col overflow-y-auto !text-white  p-6 `}>
            {children}
          </div>
          {childrenFooter && <footer className=" px-6 pb-6  flex items-center justify-between w-full">
            {childrenFooter}
          </footer>}
          </div>
        </dialog>
        
      </div>
    )
  );
};
