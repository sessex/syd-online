import Hero from './Hero';
import About from './About';
import Projects from './Projects';
import Experience from './Experience';
import Footer from './Footer';

export default function HomeContent() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <About />
      <Projects />
      <Experience />
      <Footer />
    </div>
  );
}
