import HomeContent from '@/components/HomeContent';
import PageEntrance from '@/components/PageEntrance';
import PixelWishesCursor from '@/components/pixel-wishes/PixelWishesCursor';

export default function Home() {
  return (
    <>
      <PageEntrance><HomeContent /></PageEntrance>
      <PixelWishesCursor />
    </>
  );
}
