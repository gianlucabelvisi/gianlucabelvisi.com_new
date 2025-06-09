import '@fontsource/irish-grover';

interface PonyProps {
  children: React.ReactNode;
  fontSize?: string;
}

export default function Pony({ children, fontSize = "1.4rem" }: PonyProps) {
  return (
    <span 
      style={{
        fontFamily: "Irish Grover, cursive",
        fontSize: fontSize,
        paddingBottom: "1.5rem",
        paddingLeft: "3rem",
        paddingRight: "3rem",
        display: "inline-block" // Allows padding while still being inline
      }}
    >
      {children}
    </span>
  );
} 