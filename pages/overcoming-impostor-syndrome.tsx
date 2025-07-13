import styles from '../styles/RedirectPage.module.css'

export default function OvercomingImpostorSyndrome() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Overcoming Impostor Syndrome</h1>
        <p className={styles.description}>
          This page has moved to a new location.
        </p>
        <a href="/posts/2021/impostor/overcoming-impostor-syndrome" className={styles.link}>
          Click here to go to the new page →
        </a>
      </div>
    </div>
  )
} 