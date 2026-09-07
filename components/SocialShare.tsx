import { useState } from 'react';
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
import { FiLink, FiShare2, FiCheck } from 'react-icons/fi';
import { SITE_URL } from '../lib/routes';
import styles from '../styles/SocialShare.module.css';

interface SocialShareProps {
  path: string;
  title: string;
  description?: string;
  /** Absolute or site-relative image used by Pinterest */
  image?: string;
  /** "vertical" = sticky sidebar (desktop); "horizontal" = inline row (mobile / post end) */
  layout?: 'vertical' | 'horizontal';
}

const SocialShare = ({ path, title, description, image, layout = 'vertical' }: SocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/${path.replace(/^\/+/, '')}`;
  const media = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : `${SITE_URL}/images/og-default.jpg`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — nothing to do */
    }
  };

  // Native share sheet where available (mobile), otherwise copy the link
  const nativeShare = async () => {
    if (typeof navigator.share !== 'function') {
      copyLink();
      return;
    }
    try {
      await navigator.share({ title, text: description, url });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className={`${styles.socialShare} ${layout === 'horizontal' ? styles.horizontal : ''}`} role="group" aria-label="Share this post">
      <div className={styles.shareItem} data-tooltip="Share on Facebook">
        <FacebookShareButton url={url} hashtag="#gianlucabelvisi" aria-label="Share on Facebook">
          <FacebookIcon size={32} round={true} />
        </FacebookShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Post on X">
        <TwitterShareButton url={url} title={title} aria-label="Post on X">
          <TwitterIcon size={32} round={true} />
        </TwitterShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Post to Reddit">
        <RedditShareButton url={url} title={title} aria-label="Post to Reddit">
          <RedditIcon size={32} round={true} />
        </RedditShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Send on WhatsApp">
        <WhatsappShareButton url={url} title={title} separator=" — " aria-label="Send on WhatsApp">
          <WhatsappIcon size={32} round={true} />
        </WhatsappShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Save to Instapaper">
        <InstapaperShareButton url={url} title={title} description={description} aria-label="Save to Instapaper">
          <InstapaperIcon size={32} round={true} />
        </InstapaperShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Pin on Pinterest">
        <PinterestShareButton url={url} description={title} media={media} aria-label="Pin on Pinterest">
          <PinterestIcon size={32} round={true} />
        </PinterestShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip={copied ? 'Link copied!' : 'Copy link'}>
        <button type="button" className={styles.iconButton} onClick={copyLink} aria-label={copied ? 'Link copied' : 'Copy link'}>
          {copied ? <FiCheck aria-hidden="true" /> : <FiLink aria-hidden="true" />}
        </button>
      </div>
      <div className={`${styles.shareItem} ${styles.nativeOnly}`} data-tooltip="Share…">
        <button type="button" className={styles.iconButton} onClick={nativeShare} aria-label="Share via your device">
          <FiShare2 aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default SocialShare;
