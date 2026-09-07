import React, { useMemo } from "react"
import Image from "next/image"
import styles from "./Books2022.module.css"
import books2022Data from "../data/Books2022.json"

interface Books2022Props {
  background?: string
}

// Deterministic pseudo-random in [0, 1): same output on server and client, so the
// "random" stack looks natural without causing hydration mismatches.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const Books2022: React.FC<Books2022Props> = () => {
  // Only show first 8 books for a cleaner animation
  const visibleBooks = useMemo(() => {
    return books2022Data.slice(0, 8).map((book, index) => {
      const filename = book.img.split("/").pop() || ""
      const r = (n: number) => pseudoRandom(index * 10 + n)

      // Stack angles (human-like placement) between -15° and 15°
      const stackRotation = (r(1) - 0.5) * 30

      // Flight directions - EPIC launches!
      const flyX = (r(2) - 0.5) * (1000 + r(3) * 9000) + "px"
      const flyY = (r(4) - 0.5) * (800 + r(5) * 7200) + "px"

      // Final rotation for flight
      const finalRotation = r(6) * 360 + "deg"

      return {
        src: filename,
        title: book.name || `Book ${index + 1}`,
        stackRotation: stackRotation + "deg",
        flyX,
        flyY,
        finalRotation
      }
    })
  }, []) // Empty dependency array ensures this runs only once

  // Book covers are in the post directory
  const imagePath = '/images/posts/2023/books-2022';

  return (
    <div className={styles.container}>
      <div className={styles.stack}>
        {visibleBooks.map((book, index) => (
          <div
            key={index}
            className={styles.book}
            style={{
              "--delay": `${index * 10}s`, // 10 seconds between each book
              "--z-index": visibleBooks.length - index, // Top book has highest z-index
              "--stack-rotation": book.stackRotation,
              "--offset-x": `${(index % 2) * 4}px`, // Slight offset for realistic stack
              "--offset-y": `${index * -2}px`, // Stack them slightly on top of each other
              "--fly-x": book.flyX,
              "--fly-y": book.flyY,
              "--final-rotation": book.finalRotation
            } as React.CSSProperties}
          >
            <Image
              src={`${imagePath}/${book.src}`}
              alt={book.title}
              className={styles.bookCover}
              width={120}
              height={160}
              sizes="120px"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Books2022











