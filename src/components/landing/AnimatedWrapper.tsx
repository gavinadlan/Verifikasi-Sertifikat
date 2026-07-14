'use client'

import { motion, Transition, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

const transition: Transition = { duration: 0.5, ease: 'easeOut' }
const viewport = { once: true, margin: "-50px" } // Start animating slightly before it comes fully into view

interface BaseProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  id?: string
}

type DivProps = BaseProps & HTMLMotionProps<"div">
type SectionProps = BaseProps & HTMLMotionProps<"section">

// Untuk Section (fade in + slide up)
export function AnimatedSection({ children, className, style, id, ...rest }: SectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ y: 40, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={viewport}
      transition={transition}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </motion.section>
  )
}

// Untuk Heading (slide dari kiri)
export function AnimatedHeading({ children, className, style, ...rest }: DivProps) {
  return (
    <motion.div
      initial={{ x: -30, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={viewport}
      transition={transition}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// Untuk Text/Paragraph (fade in dengan delay)
export function AnimatedText({ children, className, style, delay = 0.2, ...rest }: DivProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={viewport}
      transition={{ ...transition, delay }}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// Untuk Container yang punya children berupa grid/list items (staggered)
export function AnimatedGrid({ children, className, style, ...rest }: DivProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// Untuk masing-masing item di dalam AnimatedGrid
export function AnimatedGridItem({ children, className, style, ...rest }: DivProps) {
  return (
    <motion.div
      variants={{
        hidden: { y: 40, opacity: 0 },
        visible: { y: 0, opacity: 1, transition }
      }}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// Untuk Gambar (slide dari kiri atau kanan)
export function AnimatedImage({ children, className, style, direction = 'left', ...rest }: DivProps & { direction?: 'left' | 'right' }) {
  const xOffset = direction === 'left' ? -50 : 50;
  return (
    <motion.div
      initial={{ x: xOffset, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={viewport}
      transition={transition}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
