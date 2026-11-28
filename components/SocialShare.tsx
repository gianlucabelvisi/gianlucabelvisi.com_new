import { useState } from 'react';
import {
  FacebookShareButton,
  InstapaperShareButton,
  PinterestShareButton,
  RedditShareButton,
  TwitterShareButton,
  WhatsappShareButton
} from "react-share";
import { FiLink, FiShare2, FiCheck } from 'react-icons/fi';
import { FaFacebookF, FaPinterestP, FaRedditAlien, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';
import { SiInstapaper } from 'react-icons/si';
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
        <FacebookShareButton className={styles.iconButton} resetButtonStyle={false} url={url} hashtag="#gianlucabelvisi" aria-label="Share on Facebook">
          <FaFacebookF aria-hidden="true" />
        </FacebookShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Post on X">
        <TwitterShareButton className={styles.iconButton} resetButtonStyle={false} url={url} title={title} aria-label="Post on X">
          <FaXTwitter aria-hidden="true" />
        </TwitterShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Post to Reddit">
        <RedditShareButton className={styles.iconButton} resetButtonStyle={false} url={url} title={title} aria-label="Post to Reddit">
          <FaRedditAlien aria-hidden="true" />
        </RedditShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Send on WhatsApp">
        <WhatsappShareButton className={styles.iconButton} resetButtonStyle={false} url={url} title={title} separator=" — " aria-label="Send on WhatsApp">
          <FaWhatsapp aria-hidden="true" />
        </WhatsappShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Save to Instapaper">
        <InstapaperShareButton className={styles.iconButton} resetButtonStyle={false} url={url} title={title} description={description} aria-label="Save to Instapaper">
          <SiInstapaper aria-hidden="true" />
        </InstapaperShareButton>
      </div>
      <div className={styles.shareItem} data-tooltip="Pin on Pinterest">
        <PinterestShareButton className={styles.iconButton} resetButtonStyle={false} url={url} description={title} media={media} aria-label="Pin on Pinterest">
          <FaPinterestP aria-hidden="true" />
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
