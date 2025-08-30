import React, { useMemo } from "react"
import styles from "./Books2022.module.css"
import books2022Data from "../data/Books2022.json"

interface Books2022Props {
  background?: string
}

const Books2022: React.FC<Books2022Props> = ({ background = "desk4" }) => {
  // Only show first 8 books for a cleaner animation
  const visibleBooks = useMemo(() => {
    return books2022Data.slice(0, 8).map((book, index) => {
      const filename = book.img.split("/").pop() || ""
      
      // Generate random stack angles (human-like placement)
      const stackRotation = (Math.random() - 0.5) * 30 // Random angle between -15° and 15°
      
      // Generate random flight directions - EPIC launches!
      const flyX = (Math.random() - 0.5) * (1000 + Math.random() * 9000) + "px" // Random between -1000px to -10000px or +1000px to +10000px
      const flyY = (Math.random() - 0.5) * (800 + Math.random() * 7200) + "px" // Random between -800px to -8000px or +800px to +8000px
      
      // Random final rotation for flight
      const finalRotation = Math.random() * 360 + "deg"
      
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
            <img
              src={`${imagePath}/${book.src}`}
              alt={book.title}
              className={styles.bookCover}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Books2022











