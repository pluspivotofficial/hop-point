import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import RichTextEditor from "@/components/RichTextEditor";
import { PREFECTURES } from "@/lib/prefectures";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { Plus, Pencil, Trash2, ArrowLeft, Video, MapPin, Calendar } from "lucide-react";

interface EventReport {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  region: string | null;
  event_date: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const AdminEventsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<EventReport[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [region, setRegion] = useState<string>("");
  const [eventDate, setEventDate] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const admin = roles?.some((r: any) => r.role === "admin") ?? false;
    setIsAdmin(admin);
    if (admin) {
      const { data } = await supabase
        .from("event_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setReports(data as EventReport[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditing(false);
    setEditId(null);
    setTitle("");
    setContent("");
    setExcerpt("");
    setRegion("");
    setEventDate("");
    setYoutubeUrl("");
    setThumbnailUrl("");
    setIsPublished(false);
  };

  const handleEdit = (r: EventReport) => {
    setEditing(true);
    setEditId(r.id);
    setTitle(r.title);
    setContent(r.content);
    setExcerpt(r.excerpt || "");
    setRegion(r.region || "");
    setEventDate(r.event_date || "");
    setYoutubeUrl(r.youtube_url || "");
    setThumbnailUrl(r.thumbnail_url || "");
    setIsPublished(r.is_published);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast({ title: "タイトルを入力してください", variant: "destructive" });
      return;
    }
    if (youtubeUrl.trim() && !getYouTubeEmbedUrl(youtubeUrl)) {
      toast({
        title: "YouTube URLを確認してください",
        description: "限定公開（非公開ではない）動画のURLを貼り付けてください",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const payload = {
      title,
      content,
      excerpt: excerpt || null,
      region: region || null,
      event_date: eventDate || null,
      youtube_url: youtubeUrl.trim() || null,
      thumbnail_url: thumbnailUrl || null,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
      author_id: user.id,
    };

    if (editId) {
      const { data, error } = await supabase
        .from("event_reports")
        .update(payload)
        .eq("id", editId)
        .select()
        .single();
      if (error) {
        toast({ title: "エラー", description: error.message, variant: "destructive" });
      } else {
        setReports((prev) => prev.map((r) => (r.id === editId ? (data as EventReport) : r)));
        toast({ title: "イベントレポートを更新しました" });
        resetForm();
      }
    } else {
      const { data, error } = await supabase
        .from("event_reports")
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast({ title: "エラー", description: error.message, variant: "destructive" });
      } else {
        setReports((prev) => [data as EventReport, ...prev]);
        toast({ title: "イベントレポートを作成しました" });
        resetForm();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("event_reports").delete().eq("id", id);
    if (error) {
      toast({ title: "削除に失敗しました", description: error.message, variant: "destructive" });
    } else {
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "イベントレポートを削除しました" });
      if (editId === id) resetForm();
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `event-thumbnails/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("column-images").upload(path, file);
    if (error) {
      toast({ title: "アップロードに失敗しました", variant: "destructive" });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("column-images").getPublicUrl(path);
    setThumbnailUrl(publicUrl);
  };

  if (loading) {
    return (
      <AppLayout title="イベントレポート管理">
        <p className="text-center text-muted-foreground py-12">読み込み中...</p>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout title="イベントレポート管理">
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">管理者権限が必要です</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (editing) {
    const embedUrl = getYouTubeEmbedUrl(youtubeUrl);
    return (
      <AppLayout title={editId ? "レポート編集" : "新規レポート"}>
        <Button variant="ghost" size="sm" className="mb-4" onClick={resetForm}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 一覧に戻る
        </Button>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 鹿児島 介護フェア 2026 レポート" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>開催地域</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="都道府県" />
                </SelectTrigger>
                <SelectContent>
                  {PREFECTURES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>開催日</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>YouTube動画URL（限定公開）</Label>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtu.be/..."
            />
            <p className="text-[11px] text-muted-foreground">
              YouTubeで動画を<strong>「限定公開」</strong>にしてURLを貼り付けてください（「非公開」は埋め込み再生できません）。
            </p>
            {embedUrl && (
              <div className="aspect-video w-full rounded-lg overflow-hidden border mt-2">
                <iframe
                  src={embedUrl}
                  title="YouTube preview"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>概要（一覧表示用）</Label>
            <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="レポートの概要を短く..." />
          </div>

          <div className="space-y-2">
            <Label>サムネイル画像（任意）</Label>
            <Input type="file" accept="image/*" onChange={handleThumbnailUpload} />
            {thumbnailUrl && (
              <img src={thumbnailUrl} alt="thumbnail" className="h-24 w-auto rounded-lg object-cover mt-2" />
            )}
          </div>

          <div className="space-y-2">
            <Label>本文</Label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            <div>
              <p className="text-sm font-medium">{isPublished ? "公開" : "下書き"}</p>
              <p className="text-xs text-muted-foreground">
                {isPublished ? "ユーザーのイベント一覧に表示されます" : "保存のみ。ユーザーには表示されません"}
              </p>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
            {saving ? "保存中..." : editId ? "更新する" : "作成する"}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="イベントレポート管理">
      <Button className="w-full mb-5" onClick={() => setEditing(true)}>
        <Plus className="h-4 w-4 mr-2" /> 新規レポート作成
      </Button>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">まだイベントレポートがありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {r.thumbnail_url && (
                    <img src={r.thumbnail_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={r.is_published ? "default" : "secondary"} className="text-[10px]">
                        {r.is_published ? "公開中" : "下書き"}
                      </Badge>
                      {r.region && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {r.region}
                        </Badge>
                      )}
                      {r.youtube_url && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Video className="h-2.5 w-2.5" />
                          動画
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm truncate">{r.title}</p>
                    {r.event_date && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(r.event_date).toLocaleDateString("ja-JP")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default AdminEventsPage;
