import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function ServicesPage() {
  const supabase = createServerSupabaseClient();
  const { data: products } = await supabase.from('products').select('id, name, description, image_url, category, live_chat_enabled, service_type').or('service_type.eq.design,category.ilike.%Design%,category.ilike.%Edit%').eq('is_active', true);
  return <div className="space-y-8"><div><div className="text-sm uppercase tracking-[0.2em] text-slate-400">Desain & Jasa Edit</div><h1 className="mt-2 text-3xl font-bold text-white">Layanan custom dengan live chat</h1></div><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{products?.map((item:any)=><Link key={item.id} href={`/products/${item.id}`}><Card className="overflow-hidden p-0"><img src={item.image_url} alt={item.name} className="aspect-[4/3] w-full object-cover" /><div className="space-y-3 p-5"><div className="font-semibold text-white">{item.name}</div><div className="text-sm leading-6 text-slate-300">{item.description}</div><div className="text-xs uppercase tracking-[0.2em] text-emerald-300">{item.live_chat_enabled ? 'Live chat aktif' : 'Konsultasi manual'}</div></div></Card></Link>)}</div></div>;
}
