import {
  FacebookIcon,
  FacebookShareButton,
  InstapaperIcon,
  InstapaperShareButton,
  PinterestIcon,
  PinterestShareButton,
  RedditIcon,
  RedditShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton
} from "react-share";
import styles from '../styles/SocialShare.module.css';

interface SocialShareProps {
  path: string;
}

const SocialShare = ({ path }: SocialShareProps) => {
  const url = "https://gianlucabelvisi.com/" + path;

  return (
    <div className={styles.socialShare}>
      <FacebookShareButton url={url} title="BoomerBook">
        <FacebookIcon size={32} round={true} />
      </FacebookShareButton>
      <TwitterShareButton url={url} title="Tweet">
        <TwitterIcon size={32} round={true} />
      </TwitterShareButton>
      <RedditShareButton url={url} title="Reddit it">
        <RedditIcon size={32} round={true} />
      </RedditShareButton>
      <WhatsappShareButton url={url} title="WhatsApp">
        <WhatsappIcon size={32} round={true} />
      </WhatsappShareButton>
      <InstapaperShareButton url={url} title="InstaPaper">
        <InstapaperIcon size={32} round={true} />
      </InstapaperShareButton>
      <PinterestShareButton url={url} title="Pin">
        <PinterestIcon size={32} round={true} />
      </PinterestShareButton>
    </div>
  );
};

export default SocialShare; 