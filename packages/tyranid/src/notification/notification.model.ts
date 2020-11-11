import { Tyr } from 'tyranid';
import { ObjectID } from 'mongodb';

import 'tyranid/builtin/server';

export const Notification = new Tyr.Collection({
  id: '_n0',
  name: 'tyrNotification',
  express: {
    rest: true,
  },
  internal: true,
  fields: {
    _id: { is: 'mongoid' },
    to: { link: 'user?' },
    type: { link: 'tyrNotificationType' },
    text: { is: 'string' },
  },
  service: {
    send: {
      params: {
        to: { is: 'mongoid', required: true },
        type: { link: 'tyrNotificationType', required: true },
        message: { is: 'string', defaultValue: '' },
      },
    },
    sendInvalidate: {
      params: {
        to: { is: 'mongoid', required: true },
      },
    },
    sendInfo: {
      params: {
        to: { is: 'mongoid', required: true },
        message: { is: 'string', required: true },
      },
    },
    sendWarning: {
      params: {
        to: { is: 'mongoid', required: true },
        message: { is: 'string', required: true },
      },
    },
    sendSuccess: {
      params: {
        to: { is: 'mongoid', required: true },
        message: { is: 'string', required: true },
      },
    },
    sendError: {
      params: {
        to: { is: 'mongoid', required: true },
        message: { is: 'string', required: true },
      },
    },
  },
}) as Tyr.TyrNotificationCollection;

Notification.service = {
  async send(to: ObjectID, type: Tyr.TyrNotificationTypeId, text: string) {
    await Notification.save({ to, type, text });
  },
  async sendInvalidate(to: ObjectID) {
    await Notification.send(to, Tyr.byName.tyrNotificationType.INVALIDATE._id);
  },

  async sendInfo(to: ObjectID, message: string) {
    return Notification.send(
      to,
      Tyr.byName.tyrNotificationType.INFO._id,
      message
    );
  },

  async sendWarning(to: ObjectID, message: string) {
    return Notification.send(
      to,
      Tyr.byName.tyrNotificationType.WARNING._id,
      message
    );
  },

  async sendSuccess(to: ObjectID, message: string) {
    return Notification.send(
      to,
      Tyr.byName.tyrNotificationType.SUCCESS._id,
      message
    );
  },

  async sendError(to: ObjectID, message: string) {
    return Notification.send(
      to,
      Tyr.byName.tyrNotificationType.ERROR._id,
      message
    );
  },
};
