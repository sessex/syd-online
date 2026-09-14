import Hero from './Hero';
import About from './About';
import Projects from './Projects';
import Experience from './Experience';
import Footer from './Footer';
import SmoothScroll from './SmoothScroll';
import TitleTrails from './title-trails/TitleTrails';

export default function HomeContent() {
  return (
    <div className="min-h-screen bg-white">
      <SmoothScroll />
      <main>
        <Hero />
        <About />
        <TitleTrails>
          <Experience />
          <Projects />
        </TitleTrails>
      </main>
      <Footer />
    </div>
  );
}
