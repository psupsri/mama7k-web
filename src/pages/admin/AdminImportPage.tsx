import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../../api/admin'
import { IMPORT_COLUMNS, templateCsv, type ImportRow, type MasterEntity } from '../../api/admin'
import { useToast } from '../../hooks/useToast'
import { errorMessage } from '../../lib/errors'
import { ENTITIES, ENTITY_LABEL } from './labels'

const STATUS_LABEL: Record<ImportRow['status'], string> = {
  CREATE: 'เพิ่มใหม่',
  UPDATE: 'แก้ไข',
  UNCHANGED: 'ไม่เปลี่ยน',
  ERROR: 'Error',
}
const STATUS_CLASS: Record<ImportRow['status'], string> = {
  CREATE: 'badge-public',
  UPDATE: 'badge-gold',
  UNCHANGED: 'badge-soft',
  ERROR: 'badge-danger',
}

export function AdminImportPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [entity, setEntity] = useState<MasterEntity>('characters')
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState<ImportRow[] | null>(null)

  const doPreview = useMutation({
    mutationFn: () => adminApi.adminPreviewImport(entity, csv),
    onSuccess: setPreview,
    onError: (e) => {
      setPreview(null)
      toast(errorMessage(e), true)
    },
  })
  const commit = useMutation({
    mutationFn: () => adminApi.adminCommitImport(entity, preview!),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['master'] })
      toast(`นำเข้าแล้ว: เพิ่ม ${r.created} แก้ไข ${r.updated}`)
      setPreview(null)
      setCsv('')
    },
    onError: (e) => toast(errorMessage(e), true),
  })

  const download = () => {
    const blob = new Blob(['﻿' + templateCsv(entity)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${entity}-template.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const errors = preview?.filter((r) => r.status === 'ERROR').length ?? 0
  const changes = preview?.filter((r) => r.status === 'CREATE' || r.status === 'UPDATE').length ?? 0

  return (
    <div className="stack">
      <div className="row wrap">
        {ENTITIES.map((e) => (
          <button
            key={e}
            className="chip"
            aria-pressed={entity === e}
            onClick={() => {
              setEntity(e)
              setPreview(null)
            }}
          >
            {ENTITY_LABEL[e]}
          </button>
        ))}
      </div>

      <section className="card stack">
        <div className="row between wrap">
          <span className="label">1. เตรียมไฟล์ CSV ({ENTITY_LABEL[entity]})</span>
          <button className="btn btn-sm" onClick={download}>
            ดาวน์โหลด template
          </button>
        </div>
        <p className="small muted">
          คอลัมน์: <code>{IMPORT_COLUMNS[entity].join(', ')}</code> · alias หลายค่าคั่นด้วย <code>|</code> · ระบบจับคู่รายการด้วย code ·
          รายการที่ไม่อยู่ในไฟล์จะไม่ถูกปิดใช้งาน ต้องตั้ง active เป็น false เอง
        </p>
        <label className="btn btn-sm" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
          เลือกไฟล์ CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) f.text().then((t) => setCsv(t.replace(/^﻿/, '')))
              setPreview(null)
            }}
          />
        </label>
        <label className="field">
          <span>หรือวางข้อความ CSV</span>
          <textarea
            className="textarea"
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, minHeight: 140 }}
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value)
              setPreview(null)
            }}
          />
        </label>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!csv.trim() || doPreview.isPending} onClick={() => doPreview.mutate()}>
          2. ตรวจสอบก่อนนำเข้า
        </button>
      </section>

      {preview && (
        <section className="card stack">
          <div className="row between wrap">
            <span className="label">
              ผลตรวจสอบ: {preview.length} แถว · เปลี่ยนแปลง {changes} · error {errors}
            </span>
            <button className="btn btn-primary" disabled={errors > 0 || changes === 0 || commit.isPending} onClick={() => commit.mutate()}>
              3. ยืนยันนำเข้า
            </button>
          </div>
          {errors > 0 && <p className="error-text">มี error {errors} แถว ต้องแก้ไฟล์ก่อน ระบบจะนำเข้าทั้งหมดหรือไม่นำเข้าเลย</p>}
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>แถว</th>
                  <th>code</th>
                  <th>ผล</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.line}>
                    <td className="faint">{r.line}</td>
                    <td>{r.code}</td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </td>
                    <td className="small muted">{r.error ?? (r.changes.length ? `เปลี่ยน: ${r.changes.join(', ')}` : r.item?.name)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="faint small">การนำเข้ารูปแบบ zip (ชื่อไฟล์ตาม code) จะทำในฝั่ง API ตอนนี้อัปโหลดรูปได้ทีละรายการในหน้า Master Data</p>
    </div>
  )
}
