import Link from 'next/link'
import Image from 'next/image'
import { FiArrowRight } from 'react-icons/fi'
import SEO from '../components/SEO'
import { PROJECTS } from '../lib/projects'
import styles from '../styles/Projects.module.css'

/** Projects: the things I build that aren't posts. Each card opens its own full-screen page. */
export default function Projects() {
  return (
    <div className={styles.page}>
      <SEO
        title="Projects"
        description="Things I build when I'm not writing: a 3D walkthrough of our Copenhagen apartment, Pantelleria as an explorable map, and more to come."
        path="/projects"
      />

      <header className={styles.header}>
        <p className={styles.kicker}>Projects</p>
        <h1 className={styles.title}>Things I build <em>when I&apos;m not writing</em></h1>
        <p className={styles.lede}>Interactive side projects, made for fun and for real life. More will land here as they grow up.</p>
      </header>

      <ul className={styles.grid}>
        {PROJECTS.map((p, i) => (
          <li key={p.slug} style={{ animationDelay: `${i * 60}ms` }} className={styles.item}>
            <Link href={p.href} className={styles.card}>
              <span className={styles.media}>
                <Image src={p.image} alt={p.title} fill sizes="(max-width: 900px) 100vw, 560px" priority={i === 0} />
              </span>
              <span className={styles.body}>
                <span className={styles.cardKicker}>{p.kicker}</span>
                <span className={styles.cardTitle}>{p.title}</span>
                <span className={styles.cardBlurb}>{p.blurb}</span>
                <span className={styles.open}>Open <FiArrowRight aria-hidden="true" /></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
