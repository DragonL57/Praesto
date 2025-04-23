import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

export const Greeting = () => {
  const isMobile = useIsMobile();
  
  return (
    <div
      key="overview"
      className={`max-w-3xl mx-auto px-8 size-full flex flex-col ${isMobile ? 'justify-start mt-52' : 'justify-center md:mt-20'}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-semibold"
      >
        Welcome to Praesto!
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-2xl text-zinc-500"
      >
        How can I assist you today?
      </motion.div>
    </div>
  );
};
