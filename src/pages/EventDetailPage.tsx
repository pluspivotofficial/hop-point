import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";

interface EventDetail {
  id: string;
  title: string;
  content: string;
  region: string | null;
  event_date: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
}

const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("event_reports")
      .select("id, title, content, region, event_date, youtube_url, thumbnail_url, published_at")
      .eq("id", id)
      .eq("is_published", true)
      .single()
      .then(({ data }) => {
        if (data) setReport(data as EventDetail);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="イベントレポート">
        <p className="text-center text-muted-foreground py-12">読み込み中...</p>
      </AppLayout>
    );
  }

  if (!report) {
    return (
      <AppLayout title="イベントレポート">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">イベントレポートが見つかりません</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/events")}>
              一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(report.youtube_url);

  return (
    <AppLayout title="イベントレポート">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> 戻る
      </Button>

      {embedUrl ? (
        <div className="aspect-video w-full rounded-xl overflow-hidden mb-4 bg-black">
          <iframe
            src={embedUrl}
            title={report.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        report.thumbnail_url && (
          <img src={report.thumbnail_url} alt={report.title} className="w-full h-48 object-cover rounded-xl mb-4" />
        )
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {report.region && (
            <Badge variant="outline" className="text-xs gap-1">
              <MapPin className="h-3 w-3" />
              {report.region}
            </Badge>
          )}
          {report.event_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(report.event_date).toLocaleDateString("ja-JP")}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground leading-tight">{report.title}</h1>
      </div>

      {report.content && (
        <Card>
          <CardContent className="p-5">
            <div
              className="prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-primary [&_blockquote]:border-l-primary"
              dangerouslySetInnerHTML={{ __html: report.content }}
            />
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default EventDetailPage;
