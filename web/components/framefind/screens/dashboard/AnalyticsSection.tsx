import type { PhotographerAnalytics } from "@/lib/api";
import { Icons } from "../../icons";
import { ClayCard } from "../../ui/ClayCard";

export function AnalyticsSection({ analyticsData, isLoadingAnalytics }: { analyticsData: PhotographerAnalytics | null; isLoadingAnalytics: boolean }) {
    if (isLoadingAnalytics) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-orange-500">
          <Icons.Loader className="w-8 h-8 animate-spin" />
          <span className="text-sm font-bold">Loading real-time analytics...</span>
        </div>
      );
    }

    const data = analyticsData || {
      totalViews: 0,
      uniqueUsers: 0,
      photosDelivered: 0,
      totalPhotos: 0,
      monthlyViews: Array(12).fill(0),
      monthlyInteractions: Array(12).fill(0),
      trends: { views: "+0%", users: "+0%", photos: "+0%" }
    };

    const maxVal = Math.max(...data.monthlyViews, ...data.monthlyInteractions, 10);

    return (
      <div className="cd-analytics space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="cd-section-heading"><span>STUDIO PERFORMANCE</span><h1>Analytics</h1><p>A clear view of how your event galleries are reaching people.</p></header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Views", value: data.totalViews.toLocaleString(), icon: Icons.Eye, color: "bg-blue-500", trend: data.trends.views },
            { label: "Unique Users", value: data.uniqueUsers.toLocaleString(), icon: Icons.Users, color: "bg-purple-500", trend: data.trends.users },
            { label: "Photos Delivered", value: data.photosDelivered.toLocaleString(), icon: Icons.Image, color: "bg-green-500", trend: data.trends.photos }
          ].map((stat, i) => (
            <ClayCard key={i} className="cd-analytics-stat p-6 border-orange-100 shadow-clay-card transition-all group overflow-hidden relative">
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-white shadow-clay-pressed group-hover:rotate-6 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted uppercase tracking-[0.1em] mb-0.5">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                     <p className="text-2xl font-black text-charcoal">{stat.value}</p>
                     <span className={`text-[10px] font-black ${stat.trend.startsWith("-") ? "text-red-500" : "text-green-500"}`}>{stat.trend}</span>
                  </div>
                </div>
              </div>
              <stat.icon className="absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] text-charcoal -rotate-12" />
            </ClayCard>
          ))}
        </div>

        <ClayCard className="cd-analytics-chart p-8 border-orange-100 shadow-clay-card bg-white overflow-hidden relative">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h3 className="text-xl font-black text-charcoal mb-1">Growth & Traffic</h3>
              <p className="text-xs text-muted font-bold">Audience engagement across all live events</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-[10px] font-black text-blue-600 border border-blue-100">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Views
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-[10px] font-black text-orange-600 border border-orange-100">
                 <div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Interactions
              </div>
            </div>
          </div>
          
          <div className="h-64 w-full flex items-end gap-3 px-2">
            {data.monthlyViews.map((views, i) => {
              const interactions = data.monthlyInteractions[i] || 0;
              const viewsHeight = (views / maxVal) * 100;
              const interactionsHeight = (interactions / maxVal) * 100;

              return (
                <div key={i} className="flex-1 h-full flex items-end gap-1 group relative">
                  <div 
                    style={{ height: `${Math.max(viewsHeight, 2)}%` }} 
                    className="flex-1 bg-blue-100 group-hover:bg-blue-500 rounded-t-md transition-all duration-500 cursor-help"
                  >
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-charcoal text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-20 whitespace-nowrap">
                      {views} views, {interactions} matched
                    </div>
                  </div>
                  <div 
                    style={{ height: `${Math.max(interactionsHeight, 2)}%` }} 
                    className="flex-1 bg-orange-100 group-hover:bg-orange-500 rounded-t-md transition-all duration-500 cursor-help"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 px-2 border-t border-orange-50 pt-4">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
              <span key={m} className="text-[10px] font-black text-muted uppercase tracking-tighter">{m}</span>
            ))}
          </div>
        </ClayCard>
      </div>
    );
  }
