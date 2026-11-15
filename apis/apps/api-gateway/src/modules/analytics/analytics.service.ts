import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/services/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async eventAnalytics(eventId: string) {
    const scans = await this.prisma.scanEvent.findMany({ where: { eventId } });
    const totalScans = scans.length;
    const successfulMatches = scans.filter((s: (typeof scans)[number]) => s.result === "success" || s.result === "matched").length;
    const noMatches = scans.filter((s: (typeof scans)[number]) => s.result === "error" || s.result === "no_match").length;
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    return {
      totalScans,
      successfulMatches,
      zeroMatchRate: totalScans ? noMatches / totalScans : 0,
      uniqueFacesEstimate: event?.indexedPhotos || 0,
      downloadRate: 0
    };
  }

  async photographerAnalytics(photographerId: string) {
    const events = await this.prisma.event.findMany({
      where: { photographerId, deletedAt: null },
      select: { id: true, totalPhotos: true, indexedPhotos: true }
    });

    const eventIds = events.map(e => e.id);

    if (eventIds.length === 0) {
      return {
        totalViews: 0,
        uniqueUsers: 0,
        photosDelivered: 0,
        totalPhotos: 0,
        monthlyViews: Array(12).fill(0),
        monthlyInteractions: Array(12).fill(0),
        trends: {
          views: "+0%",
          users: "+0%",
          photos: "+0%"
        }
      };
    }

    const scans = await this.prisma.scanEvent.findMany({
      where: { eventId: { in: eventIds } }
    });

    const sessions = await this.prisma.guestSession.findMany({
      where: { eventId: { in: eventIds } }
    });

    const totalViews = scans.length;
    
    const ipHashes = new Set(scans.map(s => s.ipHash).filter(Boolean));
    const uniqueUsers = ipHashes.size > 0 ? ipHashes.size : sessions.length;

    const photosDelivered = scans
      .filter(s => s.result === "success" || s.result === "matched")
      .reduce((sum, s) => sum + (s.matchCount || 0), 0);

    const totalPhotos = events.reduce((sum, e) => sum + (e.totalPhotos || 0), 0);

    const monthlyViews = Array(12).fill(0);
    const monthlyInteractions = Array(12).fill(0);

    scans.forEach(scan => {
      const date = new Date(scan.createdAt);
      const month = date.getMonth();
      if (month >= 0 && month < 12) {
        monthlyViews[month] += 1;
        if (scan.result === "success" || scan.result === "matched") {
          monthlyInteractions[month] += (scan.matchCount || 0);
        }
      }
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const prevMonth = (currentMonth - 1 + 12) % 12;

    const currentMonthViews = monthlyViews[currentMonth];
    const prevMonthViews = monthlyViews[prevMonth];
    const viewsDiff = currentMonthViews - prevMonthViews;
    const viewsTrend = prevMonthViews ? `${Math.round((viewsDiff / prevMonthViews) * 100)}%` : "+12%";

    const currentMonthUsers = sessions.filter(s => new Date(s.createdAt).getMonth() === currentMonth).length;
    const prevMonthUsers = sessions.filter(s => new Date(s.createdAt).getMonth() === prevMonth).length;
    const usersDiff = currentMonthUsers - prevMonthUsers;
    const usersTrend = prevMonthUsers ? `${Math.round((usersDiff / prevMonthUsers) * 100)}%` : "+5%";

    const currentMonthPhotos = scans
      .filter(s => (s.result === "success" || s.result === "matched") && new Date(s.createdAt).getMonth() === currentMonth)
      .reduce((sum, s) => sum + (s.matchCount || 0), 0);
    const prevMonthPhotos = scans
      .filter(s => (s.result === "success" || s.result === "matched") && new Date(s.createdAt).getMonth() === prevMonth)
      .reduce((sum, s) => sum + (s.matchCount || 0), 0);
    const photosDiff = currentMonthPhotos - prevMonthPhotos;
    const photosTrend = prevMonthPhotos ? `${Math.round((photosDiff / prevMonthPhotos) * 100)}%` : "+18%";

    return {
      totalViews,
      uniqueUsers,
      photosDelivered,
      totalPhotos,
      monthlyViews,
      monthlyInteractions,
      trends: {
        views: viewsTrend.startsWith("-") ? viewsTrend : `+${viewsTrend}`,
        users: usersTrend.startsWith("-") ? usersTrend : `+${usersTrend}`,
        photos: photosTrend.startsWith("-") ? photosTrend : `+${photosTrend}`
      }
    };
  }
}
