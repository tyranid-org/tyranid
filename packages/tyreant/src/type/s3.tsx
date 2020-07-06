import * as React from 'react';
import { useCallback, useState } from 'react';

import { useDropzone } from 'react-dropzone';

import { Spin } from 'antd';

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps, onTypeChange } from './type';
import { withThemedTypeContext } from '../core/theme';
import { registerComponent } from '../common';
import { decorateField } from '../core';
import { toast } from '../tyreant';

interface S3Value {
  key?: string;
  filename?: string;
  type?: string;
  tmpId?: string;
  size: number;
}

export const TyrS3Base = <D extends Tyr.Document>(props: TyrTypeProps<D>) => {
  const CF_PREFIX = (Tyr.options as any).aws.cloudfrontPrefix;

  const [uploading, setUploading] = useState(false);
  const [counter, setCounter] = useState(0);
  const { document, path } = props;

  const setValue = (value: S3Value) => {
    onTypeChange(props, value, undefined);
    setCounter(counter + 1);
  };

  const deleteValue = () => {
    onTypeChange(props, undefined, undefined);
    setCounter(counter - 1);
  };

  const onDrop = useCallback(async acceptedFiles => {
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    const url = `/api/${document!.$model.def.name}/${path!.name}/s3${
      document!.$id ? '/' + document!.$id : ''
    }`;

    setUploading(true);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    const json = await response.json();
    setUploading(false);
    const { msg, tmpId, key } = json;
    if (msg) {
      Tyr.error(msg);
    } else {
      const value: S3Value = {
        key,
        filename: file.name,
        type: file.type,
        size: file.size,
      };
      if (tmpId) value.tmpId = tmpId;
      setValue(value);
      toast.success('File uploaded.');
    }
  }, []);

  // TODO:  look into using Ant Design's Upload control instead?
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  return decorateField('s3', props, () => {
    const value = path!.get(document);
    const downloadUrl = value && CF_PREFIX + value.key;

    return (
      <div>
        {value && value.type && value.type.startsWith('image/') && (
          <img className="tyr-s3-image" src={downloadUrl} />
        )}
        {value && value.filename && (
          <div>
            File <b>{value.filename}</b>
            &nbsp;&nbsp;&nbsp;
            <a href={downloadUrl}>download file</a>
            &nbsp;&nbsp;&nbsp;
            <a onClick={() => deleteValue()}>remove file</a>
          </div>
        )}
        <Spin spinning={uploading}>
          <div {...(getRootProps({ className: 'tyr-dropzone' }) as any)}>
            <input {...(getInputProps() as any)} />
            {isDragActive ? (
              <p>Drop a file here...</p>
            ) : (
              <p>Drag and drop a file here, or click to select a file</p>
            )}
          </div>
        </Spin>
      </div>
    );
  });
};

export const TyrS3 = withThemedTypeContext('s3', TyrS3Base);

byName.s3 = {
  component: TyrS3Base,
};

registerComponent('TyrS3', TyrS3);
