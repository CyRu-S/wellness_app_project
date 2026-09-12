import React from 'react';
import AdminScreen from '../../components/admin/AdminScreen';
import AdminHeader from '../../components/admin/AdminHeader';
import NotificationInbox from '../../components/common/NotificationInbox';

export default function AdminNotificationsScreen({ navigation }) {
  return <AdminScreen><AdminHeader title="Notifications" back onBackPress={() => navigation.goBack()} />
    <NotificationInbox navigation={navigation} /></AdminScreen>;
}
