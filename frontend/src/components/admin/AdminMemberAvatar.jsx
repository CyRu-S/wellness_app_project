import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ProtectedImage from '../common/ProtectedImage';
import { profileImageSource } from '../../utils/profilePhoto';

export default function AdminMemberAvatar({ profileImageUrl, token, initials, style, imageStyle, textStyle }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const source = failedUrl === profileImageUrl ? null : profileImageSource(profileImageUrl, token);

  return (
    <View style={[styles.avatar, style]}>
      {source ? (
        <ProtectedImage source={source} resizeMode="cover" onError={() => setFailedUrl(profileImageUrl)} style={[styles.image, imageStyle]} />
      ) : (
        <Text style={textStyle}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
