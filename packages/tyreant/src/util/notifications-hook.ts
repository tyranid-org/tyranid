import { useState, useEffect } from 'react';
import { Tyr } from 'tyranid/client';
import { toast } from '../tyreant';

const { TyrNotification } = Tyr.collections;

export const useNotifications = () => {
  const { user } = Tyr.local;

  const [subscribedUserId, setSubscribedUserId] = useState<
    string | undefined
  >();

  const listenForNotifications = async () => {
    if (subscribedUserId || !user) {
      return;
    }

    setSubscribedUserId(user._id);

    await TyrNotification.subscribe({ to: user._id });

    TyrNotification.on({
      type: 'change',
      async handler(event: any) {
        const n = event.document as Tyr.TyrNotification;

        if (n.text) {
          const { tyrNotificationType } = Tyr.byName;

          switch (n.type) {
            case tyrNotificationType.INVALIDATE._id:
              //giv.getNetworkOrgs(null, true);
              break;
            case tyrNotificationType.INFO._id:
              toast.info(n.text);
              break;
            case tyrNotificationType.WARNING._id:
              toast.warn(n.text);
              break;
            case tyrNotificationType.SUCCESS._id:
              toast.success(n.text);
              break;
            case tyrNotificationType.ERROR._id:
              toast.error(n.text);
              break;
            default:
              break;
          }
        }

        await n.$remove();
        //if (n.type === 'invalidateNotifications') {
        //console.log('invalidation!');
        //Global.refreshNotifications();
        //}
      },
    });
  };

  useEffect(() => {
    //if (subscribedUserId && !user) {
    //Notification.subscribe({ to: user._id }), true;
    //setSubscribedUserId(undefined);
    //} else
    if (user && !subscribedUserId) {
      listenForNotifications();
    }

    return () => {
      if (subscribedUserId) {
        TyrNotification.subscribe({ to: user._id }), true;
      }
    };
  }, [user]);

  return !!subscribedUserId;
};
