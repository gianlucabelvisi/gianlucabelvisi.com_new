import { useRef } from 'react'
import { useRouter } from 'next/router'
import { GetStaticProps } from 'next'
import { getAllPosts } from '../lib/posts'
import { groupPostsForHomepage } from '../lib/hashtags'
import { getSeriesShelf, SeriesShelfItem } from '../lib/series'
import { Caption, pickCaptions } from '../lib/captions'
import { PROJECTS, Project } from '../lib/projects'
import HomeHero from '../components/HomeHero'
import Shelf from '../components/Shelf'
import ContinueShelf from '../components/ContinueShelf'
import LazySection from '../components/LazySection'
import TitleSheet, { ProjectStory, SheetItem } from '../components/TitleSheet'
import { CaptionCard, ProjectCard, ReadCard, SeriesCard } from '../components/cards/Cards'
import { CardPost, toCardPost } from '../components/PostCard'
import SEO from '../components/SEO'
import { useProgress } from '../lib/useProgress'
import { FINISHED, STARTED } from '../lib/progress'
import type { PostSummary } from '../lib/posts'
import styles from '../styles/Home.module.css'

interface TopicRow {
  title: string
  hint: string | null
  moreHref: string
  posts: CardPost[]
}

interface HomePageProps {
  hero: PostSummary[]
  latest: CardPost[]
  series: SeriesShelfItem[]
  /** Story post per project slug, for projects that have a listed one */
  stories: Record<string, ProjectStory>
  captions: Caption[]
  topics: TopicRow[]
  randomized: CardPost[]
  chronological: CardPost[]
  /** Every listed post as a slim card: lets the "continue" row resolve any slug from the reader's history */
  all: CardPost[]
}

export default function HomePage({ hero, latest, series, stories, captions, topics, randomized, chronological, all }: HomePageProps) {
  const router = useRouter()
  const progress = useProgress()

  // The open sheet lives in the URL (/?series=caterina-sforza, /?project=apartment): it can be linked to,
  // and the phone's back gesture closes it instead of leaving the page.
  const openedHere = useRef(false)
  const param = (name: string) => (typeof router.query[name] === 'string' ? (router.query[name] as string) : null)
  const sheetSeries = series.find(s => s.slug === param('series'))
  const sheetProject = PROJECTS.find(p => p.slug === param('project'))
  const sheet: SheetItem | null = sheetSeries
    ? { kind: 'series', series: sheetSeries }
    : sheetProject
      ? { kind: 'project', project: sheetProject, story: stories[sheetProject.slug] ?? null }
      : null

  const openSheet = (query: Record<string, string>) => {
    openedHere.current = true
    router.push({ pathname: '/', query }, undefined, { shallow: true, scroll: false })
  }
  const closeSheet = () => {
    if (!sheet) return
    if (openedHere.current) {
      openedHere.current = false
      router.back()
    } else {
      router.replace('/', undefined, { shallow: true, scroll: false })
    }
  }

  // Progress bar on any card the reader has started but not finished
  const bar = (slug: string) => {
    const p = progress[slug]?.p ?? 0
    return p >= STARTED && p < FINISHED ? p : undefined
  }
  const reads = (posts: CardPost[], priority = false) =>
    posts.map((post, i) => <ReadCard key={post.slug} post={post} progress={bar(post.slug)} priority={priority && i < 4} />)

  const openProject = (project: Project) => openSheet({ project: project.slug })

  if (hero.length === 0) {
    return (
      <div className={styles.homePage}>
        <SEO />
        <div className={styles.emptyState}>
          <h1>Nothing here yet</h1>
          <p>Add some .mdx files to the /posts directory.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.homePage}>
      <SEO />
      <h1 className="sr-only">Gianluca Belvisi&apos;s blog</h1>

      <HomeHero posts={hero} />

      <div className={styles.shelves}>
        <ContinueShelf posts={all} series={series} />

        <Shelf title="Latest" moreHref="/archive" moreLabel="All posts">
          {reads(latest, true)}
        </Shelf>

        {series.length > 0 && (
          <Shelf title="Series" hint="posts that belong together">
            {series.map(s => (
              <SeriesCard key={s.slug} series={s} onOpen={item => openSheet({ series: item.slug })} />
            ))}
          </Shelf>
        )}

        <LazySection minHeight={320}>
          <Shelf title="Projects" hint="things you walk through instead of read" moreHref="/projects">
            {PROJECTS.map(p => <ProjectCard key={p.slug} project={p} onOpen={openProject} />)}
          </Shelf>
        </LazySection>

        {captions.length > 0 && (
          <LazySection minHeight={320}>
            <Shelf title="Out of context" hint="captions that wandered off from their posts">
              {captions.map(c => <CaptionCard key={`${c.slug}-${c.anchor}`} caption={c} />)}
            </Shelf>
          </LazySection>
        )}

        {topics.map(topic => (
          <LazySection key={topic.title} minHeight={300}>
            <Shelf title={topic.title} hint={topic.hint ?? undefined} moreHref={topic.moreHref}>
              {reads(topic.posts)}
            </Shelf>
          </LazySection>
        ))}

        <LazySection minHeight={300}>
          <Shelf title="Lucky dip" hint="reshuffled every hour" moreHref="/tags" moreLabel="Browse by tag">
            {reads(randomized)}
          </Shelf>
        </LazySection>

        <LazySection minHeight={300}>
          <Shelf title="From the archive" hint="where it all started" moreHref="/archive" moreLabel="All posts">
            {reads(chronological)}
          </Shelf>
        </LazySection>
      </div>

      <TitleSheet item={sheet} onClose={closeSheet} />
    </div>
  )
}

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const posts = getAllPosts()
  const summaries: PostSummary[] = posts.map(({ content: _content, ...rest }) => rest)
  const grouped = groupPostsForHomepage(summaries)

  const stories: Record<string, ProjectStory> = {}
  for (const project of PROJECTS) {
    const story = project.story ? summaries.find(p => p.slug === project.story) : undefined
    if (story) stories[project.slug] = { slug: story.slug, title: story.frontmatter.title, readingTime: story.readingTime }
  }

  return {
    props: {
      hero: summaries.slice(0, 5),
      latest: grouped.latest.map(toCardPost),
      series: getSeriesShelf(summaries),
      stories,
      captions: pickCaptions(posts),
      topics: grouped.topics.map(t => ({ title: t.title, hint: t.hint ?? null, moreHref: t.moreHref, posts: t.posts.map(toCardPost) })),
      randomized: grouped.randomized.map(toCardPost),
      chronological: grouped.chronological.map(toCardPost),
      all: summaries.map(toCardPost),
    },
    revalidate: 3600,
  }
}
