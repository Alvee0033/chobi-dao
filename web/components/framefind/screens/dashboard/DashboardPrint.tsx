import type { EventPayload } from "@/lib/api";
import type { ShowToast } from "../../types";
import { Icons } from "../../icons";
import { ClayCard } from "../../ui/ClayCard";

export function QrBannerModal({ 
  event, 
  qrData, 
  onClose,
  showToast
}: { 
  event: EventPayload; 
  qrData: string; 
  onClose: () => void;
  showToast: ShowToast;
}) {
  const eventUrl = typeof window !== "undefined"
    ? `${(window.location.hostname.includes("jantrasoft.online") || window.location.hostname.includes("sslip.io")) ? "https://chobidao.jantrasoft.online" : window.location.origin}/e/${event.slug}`
    : `https://chobidao.jantrasoft.online/e/${event.slug}`;
  const handleDownload = () => {
    try {
      showToast("Generating high-resolution banner...");
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1100;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 1100);

      // Draw decorative accents
      ctx.fillStyle = "rgba(249, 115, 22, 0.05)";
      ctx.beginPath();
      ctx.arc(800, 0, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 1100, 150, 0, Math.PI * 2);
      ctx.fill();

      // Draw border
      ctx.lineWidth = 16;
      ctx.strokeStyle = "#f97316";
      ctx.lineJoin = "round";
      
      const r = 40;
      const x = 32;
      const y = 32;
      const w = 736;
      const h = 1036;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.stroke();

      // Draw Header Chobi Dao
      ctx.fillStyle = "#27272a";
      ctx.font = "900 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Chobi Dao", 400, 120);

      // Draw Line Accent
      ctx.fillStyle = "#f97316";
      ctx.fillRect(340, 150, 120, 6);

      // Draw Event Name
      ctx.fillStyle = "#27272a";
      ctx.font = "900 42px sans-serif";
      ctx.fillText(event.name.toUpperCase(), 400, 230);

      ctx.fillStyle = "#71717a";
      ctx.font = "700 18px sans-serif";
      ctx.fillText("OFFICIAL EVENT GALLERY", 400, 275);

      // Draw Steps
      const steps = [
        { label: "SCAN QR CODE", step: "01" },
        { label: "FIND YOURSELF", step: "02" },
        { label: "GET PHOTOS", step: "03" }
      ];

      steps.forEach((step, i) => {
        const sx = 140 + i * 260;
        ctx.fillStyle = "#ffedd5";
        ctx.beginPath();
        ctx.arc(sx, 840, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ea580c";
        ctx.font = "900 24px sans-serif";
        ctx.fillText(step.step, sx, 848);

        ctx.fillStyle = "#27272a";
        ctx.font = "900 14px sans-serif";
        ctx.fillText(step.label, sx, 915);
      });

      // Draw Footer URL
      ctx.fillStyle = "rgba(39, 39, 42, 0.4)";
      ctx.font = "900 18px sans-serif";
      ctx.fillText(eventUrl.toUpperCase(), 400, 1000);

      // Load and draw QR + app logo
      const qrImg = new window.Image();
      qrImg.onload = () => {
        const logoImg = new window.Image();
        logoImg.src = "/assets/chobidao.webp";
        logoImg.onload = () => {
          ctx.drawImage(logoImg, 312, 70, 48, 48);
          drawQrAndDownload();
        };
        logoImg.onerror = () => {
          drawQrAndDownload();
        };
      };
      qrImg.onerror = () => showToast("Failed to load the event QR image");
      qrImg.src = qrData;

      const drawQrAndDownload = () => {
        ctx.fillStyle = "#fff8f1";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffedd5";
        
        const qx = 200;
        const qy = 330;
        const qw = 400;
        const qh = 400;
        const qrBorder = 30;

        ctx.beginPath();
        ctx.moveTo(qx + qrBorder, qy);
        ctx.lineTo(qx + qw - qrBorder, qy);
        ctx.quadraticCurveTo(qx + qw, qy, qx + qw, qy + qrBorder);
        ctx.lineTo(qx + qw, qy + qh - qrBorder);
        ctx.quadraticCurveTo(qx + qw, qy + qh, qx + qw - qrBorder, qy + qh);
        ctx.lineTo(qx + qrBorder, qy + qh);
        ctx.quadraticCurveTo(qx, qy + qh, qx, qy + qh - qrBorder);
        ctx.lineTo(qx, qy + qrBorder);
        ctx.quadraticCurveTo(qx, qy, qx + qrBorder, qy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(qrImg, 230, 360, 340, 340);

        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `${event.slug}-event-banner.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Banner image downloaded successfully!");
      };
    } catch (err) {
      console.error(err);
      showToast("Failed to generate banner image");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/30 backdrop-blur-md animate-in fade-in duration-300">
      <ClayCard className="w-full max-w-xl p-0 animate-[float_0.4s_ease-out_forwards] border-orange-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-orange-100 bg-orange-50/30 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-clay-pressed">
              <Icons.QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black font-heading text-xl text-charcoal">Event Access Poster</h3>
              <p className="text-muted text-[10px] font-bold uppercase tracking-wider">Share or print for event guests</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-orange-500 transition-colors p-1">
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-charcoal/5 flex justify-center items-center">
          <div className="w-[300px] h-[412px] scale-100 origin-center border-4 border-orange-500 rounded-[30px] p-6 flex flex-col items-center justify-between bg-white shadow-lg relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full -ml-12 -mb-12" />
            
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-1 mb-2">
                <img src="/assets/chobidao.webp" alt="Chobi Dao" className="w-4 h-4 object-contain" />
                <h2 className="text-[10px] font-black text-charcoal tracking-tight uppercase">Chobi Dao</h2>
              </div>
              <h1 className="text-sm font-black text-charcoal mb-0.5 truncate uppercase px-2" title={event.name}>{event.name}</h1>
              <p className="text-[7px] font-bold text-muted tracking-widest uppercase">Official Gallery</p>
            </div>

            <div className="relative p-2 bg-orange-50/50 rounded-2xl border border-orange-100 shadow-inner flex items-center justify-center">
              <div className="p-1 bg-white rounded-xl shadow-md border border-orange-100">
                <img src={qrData} alt="QR Code" className="w-24 h-24 object-contain" />
              </div>
            </div>

            <div className="text-center w-full">
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { step: "01", text: "Scan", icon: Icons.QrCode },
                  { step: "02", text: "Match", icon: Icons.FaceId },
                  { step: "03", text: "Get", icon: Icons.Download },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-[8px]">
                      <item.icon size={10} />
                    </div>
                    <p className="text-[7px] font-black text-charcoal uppercase tracking-wider">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-orange-50 w-full">
                <p className="text-[7px] font-bold text-muted/60 tracking-wider truncate px-2" title={eventUrl}>{eventUrl}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-orange-100 bg-orange-50/20 flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-clay-pressed hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Icons.Download className="w-4 h-4" />
            Download Banner PNG
          </button>
          <button
            onClick={() => {
              onClose();
              window.print();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-orange-50 text-charcoal border border-orange-200 font-black text-xs shadow-clay-card hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Icons.Calendar className="w-4 h-4 text-orange-500" />
            Print Poster PDF
          </button>
        </div>
      </ClayCard>
    </div>
  );
}

export function PrintableAccessCard({ event, qrData }: { event: EventPayload; qrData: string }) {
  if (!qrData) return null;
  const eventUrl = typeof window !== "undefined"
    ? `${(window.location.hostname.includes("jantrasoft.online") || window.location.hostname.includes("sslip.io")) ? "https://chobidao.jantrasoft.online" : window.location.origin}/e/${event.slug}`
    : `https://chobidao.jantrasoft.online/e/${event.slug}`;
  
  return (
    <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #access-card-print, #access-card-print * { visibility: visible; }
          #access-card-print { 
            position: absolute; 
            left: 50%; 
            top: 50%; 
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          @page { size: auto; margin: 0; }
        }
      `}</style>
      
      <div id="access-card-print" className="w-[800px] h-[1100px] flex items-center justify-center p-20">
        <div className="w-full h-full border-[16px] border-orange-500 rounded-[80px] p-16 flex flex-col items-center justify-between bg-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full -ml-32 -mb-32" />
          
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center shadow-xl p-3">
                <img src="/assets/chobidao.webp" alt="Chobi Dao logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-6xl font-black text-charcoal tracking-tighter">Chobi Dao</h2>
            </div>
            
            <div className="h-2 w-32 bg-orange-500 mx-auto rounded-full mb-12" />
            
            <h1 className="text-7xl font-black text-charcoal mb-4 uppercase leading-tight">{event.name}</h1>
            <p className="text-2xl font-bold text-muted uppercase tracking-[0.2em]">Official Event Gallery</p>
          </div>

          <div className="relative group p-10 bg-orange-50 rounded-[60px] border-4 border-orange-100 shadow-inner">
            <div className="p-8 bg-white rounded-[40px] shadow-2xl border-2 border-orange-200">
              <img src={qrData} alt="QR Code" className="w-[400px] h-[400px]" />
            </div>
          </div>

          <div className="text-center space-y-8 w-full">
            <div className="grid grid-cols-3 gap-8 mb-12">
               {[
                 { step: "01", text: "Scan QR Code", icon: Icons.QrCode },
                 { step: "02", text: "Find Yourself", icon: Icons.FaceId },
                 { step: "03", text: "Get Photos", icon: Icons.Download },
               ].map((item, i) => (
                 <div key={i} className="flex flex-col items-center gap-4">
                   <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xl">
                     <item.icon size={32} />
                   </div>
                   <p className="text-xl font-black text-charcoal uppercase tracking-widest">{item.text}</p>
                 </div>
               ))}
            </div>
            
            <div className="pt-8 border-t-4 border-orange-50 w-full">
              <p className="text-xl font-black text-charcoal/40 tracking-[0.08em]">{eventUrl}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
