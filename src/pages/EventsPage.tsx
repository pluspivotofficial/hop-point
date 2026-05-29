import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { getYouTubeThumbnail } from "@/lib/youtube";
import { Video, MapPin, Calendar } from "lucide-react";

interface EventListItem {
  id: string;
  title: string;
  excerpt: string | null;
  region: string | null;
  event_date: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
}

const EventsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("event_reports")
      .select("id, title, excerpt, region, event_date, youtube_url, thumbnail_url, published_at")
      .eq("is_published", true)
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReports(data as EventListItem[]);
        setLoading(false);
      });
  }, []);

  return (
    <AppLayout title="イベントレポート">
      {loading ? (
        <p className="text-center text-muted-foreground py-12">読み込み中...</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">まだイベントレポートがありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const cover = r.thumbnail_url || getYouTubeThumbnail(r.youtube_url);
            return (
              <Card
                key={r.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => navigate(`/events/${r.id}`)}
              >
                {cover && (
                  <div className="relative">
                    <img src={cover} alt={r.title} className="w-full h-40 object-cover" />
                    {r.youtube_url && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center">
                          <Video className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {r.region && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {r.region}
                      </Badge>
                    )}
                    {r.event_date && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(r.event_date).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm leading-snug">{r.title}</p>
                  {r.excerpt && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.excerpt}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default EventsPage;
