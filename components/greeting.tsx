import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWindowSize } from 'usehooks-ts';

export const Greeting = () => {
  const isMobile = useIsMobile();
  const { width } = useWindowSize();
  
  // Check if the device is an iPad in portrait mode (width > 768px but less than typical desktop)
  // iPad typically has width between 768px-1024px in portrait orientation
  const isIpadPortrait = width > 768 && width <= 1024;
  
  return (
    <div
      key="overview"
      className={`max-w-3xl mx-auto px-8 size-full flex flex-col ${
        isMobile ? 'justify-start mt-52' : 
        isIpadPortrait ? 'justify-start mt-60' : 
        'justify-center md:mt-20'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-semibold"
      >
        Welcome to UniTaskAI!
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-2xl text-zinc-500"
      >
        The only general AI assistant you need
      </motion.div>
    </div>
  );
};
