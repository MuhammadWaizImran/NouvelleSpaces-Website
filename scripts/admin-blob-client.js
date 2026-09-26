import {upload} from '@vercel/blob/client';

window.NouvelleBlobUpload=async(file,csrf)=>{
 const extension=(file.name.match(/\.([a-z0-9]+)$/i)?.[1]||'bin').toLowerCase();
 const pathname=`uploads/${crypto.randomUUID()}.${extension}`;
 const blob=await upload(pathname,file,{access:'private',handleUploadUrl:'/api/admin/upload',headers:{'X-CSRF-Token':csrf},multipart:file.size>4*1024*1024});
 return {src:`/api/media/${blob.pathname.replace(/^uploads\//,'')}`,type:extension==='mp4'?'mp4':extension,bytes:file.size};
};
