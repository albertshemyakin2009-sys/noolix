// pages/tests.js
import React from "react";

export default function TestsPage() {
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#000",color:"#fff",padding:"24px",fontFamily:"ui-sans-serif, system-ui"}}>
      <div style={{maxWidth:"640px",textAlign:"center"}}>
        <div style={{fontSize:"18px",fontWeight:700}}>Tests page minimal diagnostic</div>
        <div style={{marginTop:"12px",fontSize:"13px",opacity:0.8,lineHeight:1.4}}>
          Если ты видишь этот экран — роут /tests работает, а падение было внутри предыдущего файла tests.js.
        </div>
      </div>
    </div>
  );
}
