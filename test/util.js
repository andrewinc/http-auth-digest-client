const basename=function (path, suffix){
  let p = path.split( /[\/\\]/ ), name = p[p.length-1];
  return ('string'!=typeof suffix) ? name :
          name.replace(new RegExp(suffix.replace('.', '\\.')+'$'),'');
};
const dirname=function (filename,level){
  if ( ('undefined'==typeof level) || (level<=0) ) level=1;
  let removed = filename.replace(/([\/\\][^\/\\]+)([\/\\]?)$/, '$2');
  return (--level) ? dirname(removed, level) : (removed.length ? removed : '.');
}

module.exports={
  basename:basename,
  dirname:dirname
}

