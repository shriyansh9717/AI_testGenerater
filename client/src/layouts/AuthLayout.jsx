import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-exam px-12 py-14 text-white lg:flex">
     <p className="font-display text-xl font-bold text-white bg-slate-900 rounded-lg inline-block border border-slate-800 px-3 py-1">
  Prep<span className="text-blue-400">Matrix</span>
</p>
        <div>
          <h1 className="max-w-md font-display text-4xl leading-tight">
            Turn any chapter into an instant exam
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/80">
           Turn your study material into a real exam.
Upload PDFs, pages, or enter a topic. Get a timed, competitive-style test with negative marking, smart question navigation, and detailed performance insights.
          </p>
          
        </div>
        <dl className="flex gap-10 text-sm text-white/80">
          <div>✨
            <dt className=" text-white">Questions built from</dt>
            <dd className="mt-1 font-display text-lg text-white">   your own study material</dd>
          </div>
          <div>✨
            
            <dd className="mt-1 font-display text-lg text-white">Prepare Like It’s the Real Exam.</dd>
          </div>
        </dl>
         <div>
          <h1 className="max-w-md font-display text-2xl leading-tight" >🌟Study it 🌟 Test it 🌟 Master it.</h1>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
        
      </section>
    </div>
  );
}
