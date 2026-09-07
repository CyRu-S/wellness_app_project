import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform } from 'react-native';

// Web <img> elements do not send bearer headers. Fetch private media first.
export default function ProtectedImage({ source, onError, ...props }) {
  const [resolved, setResolved] = useState(null);
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  const uri = source?.uri;
  const authorization = source?.headers?.Authorization;
  const protectedWeb = Platform.OS === 'web' && !!authorization && /^https?:/i.test(uri || '');
  useEffect(() => {
    if (!protectedWeb) return undefined;
    const controller = new AbortController();
    let objectUrl;
    fetch(uri, { headers: { Authorization: authorization }, signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Photo unavailable'); return response.blob(); })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved({ sourceUri: uri, authorization, image: { uri: objectUrl } });
      })
      .catch((error) => { if (!controller.signal.aborted) onErrorRef.current?.({ nativeEvent: { error: error.message } }); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [uri, authorization, protectedWeb]);
  const resolvedSource = resolved?.sourceUri === uri && resolved?.authorization === authorization ? resolved.image : null;
  return <Image key={uri} {...props} source={protectedWeb ? resolvedSource : source} onError={onError} />;
}
