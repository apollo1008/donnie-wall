// app/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Post {
  id: number;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export default function Wall() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [charCount, setCharCount] = useState(280);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSession();
    fetchPosts();
    const channel = supabase
      .channel('realtime:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const setSession = async () => {
    const { data } = await supabase.auth.signInWithPassword({
      email: 'donnieminter13@gmail.com',
      password: 'DonnieMinter13!'
    });

  }

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setPosts(data);
  };

  const handleSubmit = async () => {
    if (!content || content.length > 280) return;
    setLoading(true);

    const { error } = await supabase.from('posts').insert([
      {
        user_id: null,
        content,
        image_url: imageUrl || null,
      },
    ]);

    if (!error) {
      setContent('');
      setImageUrl('');
      setCharCount(280);
    }
    setLoading(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setUploading(true);
    const { data, error } = await supabase.storage.from('images').upload(`public/${file.name}`, file, {
      cacheControl: '3600',
      upsert: true,
    });
    setUploading(false);

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(data.path);
      if (publicUrlData?.publicUrl) setImageUrl(publicUrlData.publicUrl);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-64 bg-gray-100 lg:h-screen p-4 border-r">
          <img
            src="/profile.jpg"
            alt="Profile"
            className="rounded-full w-48 h-48 mx-auto"
          />
          <div className="text-center mt-4">
            <h2 className="text-lg font-semibold">Donnie Minter</h2>
            <p className="text-sm text-muted-foreground">wall</p>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Button variant="outline" className="w-full">Information</Button>
            <div className="pt-2">
              <p><strong>Networks</strong><br />Stanford Alum</p>
              <p className="pt-2"><strong>Current City</strong><br />Dallas, TX</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="bg-gradient-to-r from-gray-100 to-white border rounded p-4 sm:p-6">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              maxLength={280}
              onChange={(e) => {
                setContent(e.target.value);
                setCharCount(280 - e.target.value.length);
              }}
            />
            <p className="text-sm text-muted-foreground text-right mt-2">
              {charCount} characters remaining
            </p>

            <div
              className={`mt-4 w-full p-6 text-center border-2 border-dashed rounded-md cursor-pointer transition ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex justify-center items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="animate-spin w-4 h-4" /> Uploading image...
                </div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="Uploaded" className="mx-auto h-40 object-contain" />
              ) : (
                <p className="text-sm text-muted-foreground">Drag & drop an image or tap to upload</p>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDrop({ dataTransfer: { files: [file] }, preventDefault: () => {}, stopPropagation: () => {} } as any);
                }}
              />
            </div>

            <div className="mt-4 text-right">
              <Button onClick={handleSubmit} disabled={loading || content.length === 0} className="w-full sm:w-auto">
                {loading ? (
                  <span className="flex justify-center items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Sharing...</span>
                ) : 'Share'}
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {posts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No posts yet. Be the first to share something!</p>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="border rounded p-4">
                  <p className="font-semibold mb-1">Donnie Minter</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {post.image_url && (
                    <img src={post.image_url} alt="attachment" className="rounded-md mb-2" />
                  )}
                  <p>{post.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
