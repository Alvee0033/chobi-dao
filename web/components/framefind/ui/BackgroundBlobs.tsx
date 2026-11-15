export function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[-5%] left-[-5%] w-[40vh] h-[40vh] rounded-full bg-orange-300/15 blur-[60px] animate-float" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50vh] h-[50vh] rounded-full bg-orange-400/10 blur-[80px] animate-float-delayed" />
      <div className="absolute top-[30%] right-[15%] w-[30vh] h-[30vh] rounded-full bg-amber-200/20 blur-[50px] animate-float" />
    </div>
  );
}
