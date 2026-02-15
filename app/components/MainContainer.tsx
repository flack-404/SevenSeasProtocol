export const MainContainer = ({children}: {children: React.ReactNode}) => {
    return (
    <div 
    className="flex flex-col items-center justify-start h-screen bg-[url('/sky.gif')] bg-[length:auto_100%] bg-center">
            {children}
        </div>
    )
}