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
      <div className={styles.shareItem} data-tooltip="Share on Facebook">
        <FacebookShareButton url={url} title="BoomerBook">
          <FacebookIcon size={32} round={true} />
        </FacebookShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Tweet this">
        <TwitterShareButton url={url} title="Tweet">
          <TwitterIcon size={32} round={true} />
        </TwitterShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Post to Reddit">
        <RedditShareButton url={url} title="Reddit it">
          <RedditIcon size={32} round={true} />
        </RedditShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Send on WhatsApp">
        <WhatsappShareButton url={url} title="WhatsApp">
          <WhatsappIcon size={32} round={true} />
        </WhatsappShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Save to Instapaper">
        <InstapaperShareButton url={url} title="InstaPaper">
          <InstapaperIcon size={32} round={true} />
        </InstapaperShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Pin on Pinterest">
        <PinterestShareButton
          url={url}
          title="Pin"
          media={`https://gianlucabelvisi.com/images/gianluca-1.jpg`}
        >
          <PinterestIcon size={32} round={true} />
        </PinterestShareButton>
      </div>
    </div>
  );
};

export default SocialShare;
