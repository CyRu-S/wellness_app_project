import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform } from 'react-native';
import { cachedProtectedImage } from '../../services/storage/protectedImageCache';

// Browser and native image loaders can handle authenticated URLs differently.
// Download private media ourselves so every platform uses the bearer token.
export default function ProtectedImage({ source, onError, ...props }) {
  const [resolved, setResolved] = useState(null);
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  const uri = source?.uri;
  const authorization = source?.headers?.Authorization;
  const protectedRemote = !!authorization && /^https?:/i.test(uri || '');
  useEffect(() => {
    if (!protectedRemote) return undefined;
    const controller = new AbortController();
    let objectUrl;
    const download = Platform.OS === 'web'
      ? fetch(uri, { headers: { Authorization: authorization }, signal: controller.signal })
        .then((response) => { if (!response.ok) throw new Error('Photo unavailable'); return response.blob(); })
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          return { uri: objectUrl };
        })
      : cachedProtectedImage(uri, authorization);
    download
      .then((image) => {
        if (controller.signal.aborted) {
          return;
        }
        setResolved({ sourceUri: uri, authorization, image });
      })
      .catch((error) => { if (!controller.signal.aborted) onErrorRef.current?.({ nativeEvent: { error: error.message } }); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri, authorization, protectedRemote]);
  const resolvedSource = resolved?.sourceUri === uri && resolved?.authorization === authorization ? resolved.image : null;
  return <Image key={uri} {...props} source={protectedRemote ? resolvedSource : source} onError={onError} />;
}
